/**
 * Wallet state management.
 *
 * The decrypted private key NEVER touches storage and never leaves this module - it lives only
 * in a module-level variable for the duration of an "unlocked" session, cleared on lock(),
 * tab close, or page reload. Every other layer of the app (RPC calls, tx building) only ever
 * sees addresses/public keys, plus the result of sign(), never the key material itself.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { generateKeyPair, keyPairFromPrivateKey, signBLS } from './bls';
import { encryptKeystoreEntry, decryptKeystoreEntry, type EncryptedKeystoreEntry } from './keystore';
import {
    deleteWalletEntry,
    getActiveAddress,
    listWalletEntries,
    saveWalletEntry,
    setActiveAddress as persistActiveAddress
} from './storage';
import { hexToBytes } from '../lib/bytes';

export interface WalletSummary {
    address: string; // hex
    publicKey: string; // hex
    nickname: string;
}

interface UnlockedSecret {
    address: string; // hex, lowercase
    privateKey: Uint8Array;
}

interface WalletContextValue {
    wallets: WalletSummary[];
    activeAddress: string | null;
    isUnlocked: boolean;
    loading: boolean;
    error: string | null;
    createWallet: (nickname: string, password: string) => Promise<string>;
    importWallet: (privateKeyHex: string, nickname: string, password: string) => Promise<string>;
    unlock: (address: string, password: string) => Promise<void>;
    lock: () => void;
    selectActiveWallet: (address: string) => Promise<void>;
    removeWallet: (address: string) => Promise<void>;
    /** Sign arbitrary bytes (the caller is responsible for building correct sign-bytes). */
    sign: (message: Uint8Array) => { signature: Uint8Array; publicKey: Uint8Array };
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }): JSX.Element {
    const [entries, setEntries] = useState<EncryptedKeystoreEntry[]>([]);
    const [activeAddress, setActiveAddressState] = useState<string | null>(null);
    const [unlocked, setUnlocked] = useState<UnlockedSecret | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // load persisted wallet metadata + active address on mount
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [stored, active] = await Promise.all([listWalletEntries(), getActiveAddress()]);
                if (cancelled) return;
                setEntries(stored);
                setActiveAddressState(active ?? stored[0]?.address ?? null);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'failed to load keystore');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const refreshEntries = useCallback(async () => {
        setEntries(await listWalletEntries());
    }, []);

    const createWallet = useCallback(
        async (nickname: string, password: string): Promise<string> => {
            setError(null);
            const kp = generateKeyPair();
            const entry = await encryptKeystoreEntry(nickname, kp.publicKey, kp.address, kp.privateKey, password);
            await saveWalletEntry(entry);
            await persistActiveAddress(entry.address);
            await refreshEntries();
            setActiveAddressState(entry.address);
            setUnlocked({ address: entry.address.toLowerCase(), privateKey: kp.privateKey });
            return entry.address;
        },
        [refreshEntries]
    );

    const importWallet = useCallback(
        async (privateKeyHex: string, nickname: string, password: string): Promise<string> => {
            setError(null);
            const privateKey = hexToBytes(privateKeyHex);
            const kp = keyPairFromPrivateKey(privateKey);
            const entry = await encryptKeystoreEntry(nickname, kp.publicKey, kp.address, kp.privateKey, password);
            await saveWalletEntry(entry);
            await persistActiveAddress(entry.address);
            await refreshEntries();
            setActiveAddressState(entry.address);
            setUnlocked({ address: entry.address.toLowerCase(), privateKey: kp.privateKey });
            return entry.address;
        },
        [refreshEntries]
    );

    const unlock = useCallback(
        async (address: string, password: string): Promise<void> => {
            setError(null);
            const entry = entries.find((e) => e.address.toLowerCase() === address.toLowerCase());
            if (!entry) {
                throw new Error('wallet not found');
            }
            const privateKey = await decryptKeystoreEntry(entry, password);
            setUnlocked({ address: entry.address.toLowerCase(), privateKey });
        },
        [entries]
    );

    const lock = useCallback((): void => {
        setUnlocked(null);
    }, []);

    const selectActiveWallet = useCallback(async (address: string): Promise<void> => {
        await persistActiveAddress(address);
        setActiveAddressState(address);
        // switching wallets always re-locks - the previously unlocked key must not leak across accounts
        setUnlocked(null);
    }, []);

    const removeWallet = useCallback(
        async (address: string): Promise<void> => {
            await deleteWalletEntry(address);
            await refreshEntries();
            if (unlocked?.address === address.toLowerCase()) {
                setUnlocked(null);
            }
            if (activeAddress?.toLowerCase() === address.toLowerCase()) {
                const remaining = await listWalletEntries();
                const next = remaining[0]?.address ?? null;
                setActiveAddressState(next);
                if (next) await persistActiveAddress(next);
            }
        },
        [activeAddress, refreshEntries, unlocked]
    );

    const sign = useCallback(
        (message: Uint8Array): { signature: Uint8Array; publicKey: Uint8Array } => {
            if (!unlocked || unlocked.address !== activeAddress?.toLowerCase()) {
                throw new Error('wallet is locked - unlock it with your password before signing');
            }
            const signature = signBLS(unlocked.privateKey, message);
            const entry = entries.find((e) => e.address.toLowerCase() === unlocked.address);
            if (!entry) {
                throw new Error('active wallet metadata missing');
            }
            return { signature, publicKey: hexToBytes(entry.publicKey) };
        },
        [activeAddress, entries, unlocked]
    );

    const wallets = useMemo<WalletSummary[]>(
        () =>
            entries.map((e) => ({
                address: e.address,
                publicKey: e.publicKey,
                nickname: e.nickname
            })),
        [entries]
    );

    const value: WalletContextValue = {
        wallets,
        activeAddress,
        isUnlocked: unlocked !== null && unlocked.address === activeAddress?.toLowerCase(),
        loading,
        error,
        createWallet,
        importWallet,
        unlock,
        lock,
        selectActiveWallet,
        removeWallet,
        sign
    };

    return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
    const ctx = useContext(WalletContext);
    if (!ctx) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return ctx;
}
