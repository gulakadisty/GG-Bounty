/**
 * IndexedDB persistence for encrypted keystore entries.
 *
 * Chosen over localStorage because: structured storage (no manual JSON.stringify of the whole
 * blob on every write), larger storage quota, and it's the standard browser-native store for
 * this kind of per-origin secret material. Only ciphertext + public metadata (nickname,
 * address, publicKey, salt, iv) ever touch storage - see keystore.ts. The decrypted private
 * key only ever exists in memory (WalletContext), never persisted.
 */

import type { EncryptedKeystoreEntry } from './keystore';

const DB_NAME = 'gg-bounty-keystore';
const DB_VERSION = 1;
const STORE_WALLETS = 'wallets';
const STORE_META = 'meta';
const ACTIVE_ADDRESS_KEY = 'activeAddress';

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_WALLETS)) {
                db.createObjectStore(STORE_WALLETS, { keyPath: 'address' });
            }
            if (!db.objectStoreNames.contains(STORE_META)) {
                db.createObjectStore(STORE_META);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('failed to open IndexedDB'));
    });
}

export async function saveWalletEntry(entry: EncryptedKeystoreEntry): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_WALLETS, 'readwrite');
        tx.objectStore(STORE_WALLETS).put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('failed to save wallet'));
    });
    db.close();
}

export async function listWalletEntries(): Promise<EncryptedKeystoreEntry[]> {
    const db = await openDb();
    const result = await new Promise<EncryptedKeystoreEntry[]>((resolve, reject) => {
        const tx = db.transaction(STORE_WALLETS, 'readonly');
        const req = tx.objectStore(STORE_WALLETS).getAll();
        req.onsuccess = () => resolve(req.result as EncryptedKeystoreEntry[]);
        req.onerror = () => reject(req.error ?? new Error('failed to list wallets'));
    });
    db.close();
    return result;
}

export async function getWalletEntry(address: string): Promise<EncryptedKeystoreEntry | null> {
    const db = await openDb();
    const result = await new Promise<EncryptedKeystoreEntry | null>((resolve, reject) => {
        const tx = db.transaction(STORE_WALLETS, 'readonly');
        const req = tx.objectStore(STORE_WALLETS).get(address);
        req.onsuccess = () => resolve((req.result as EncryptedKeystoreEntry | undefined) ?? null);
        req.onerror = () => reject(req.error ?? new Error('failed to read wallet'));
    });
    db.close();
    return result;
}

export async function deleteWalletEntry(address: string): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_WALLETS, 'readwrite');
        tx.objectStore(STORE_WALLETS).delete(address);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('failed to delete wallet'));
    });
    db.close();
}

export async function setActiveAddress(address: string): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_META, 'readwrite');
        tx.objectStore(STORE_META).put(address, ACTIVE_ADDRESS_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('failed to set active address'));
    });
    db.close();
}

export async function getActiveAddress(): Promise<string | null> {
    const db = await openDb();
    const result = await new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(STORE_META, 'readonly');
        const req = tx.objectStore(STORE_META).get(ACTIVE_ADDRESS_KEY);
        req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
        req.onerror = () => reject(req.error ?? new Error('failed to read active address'));
    });
    db.close();
    return result;
}
