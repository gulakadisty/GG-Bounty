import { useState } from 'react';
import { Wallet, Plus, Upload, Lock, Unlock, Copy, Trash2, Check, AlertTriangle } from 'lucide-react';
import { useWallet } from '../wallet/WalletContext';

function shortAddr(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function CopyButton({ value }: { value: string }): JSX.Element {
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => {
                await navigator.clipboard.writeText(value);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
            }}
            aria-label="Copy address"
        >
            {copied ? <Check size={14} color="var(--accent)" /> : <Copy size={14} />}
        </button>
    );
}

function CreateWalletForm({ onDone }: { onDone: () => void }): JSX.Element {
    const { createWallet } = useWallet();
    const [nickname, setNickname] = useState('My Wallet');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const submit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setErr(null);
        if (password.length < 8) {
            setErr('password must be at least 8 characters');
            return;
        }
        if (password !== confirm) {
            setErr('passwords do not match');
            return;
        }
        setBusy(true);
        try {
            await createWallet(nickname, password);
            onDone();
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'failed to create wallet');
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
                <label className="label" htmlFor="nickname">
                    Wallet name
                </label>
                <input
                    id="nickname"
                    className="input"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                />
            </div>
            <div>
                <label className="label" htmlFor="new-password">
                    Password
                </label>
                <input
                    id="new-password"
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                />
            </div>
            <div>
                <label className="label" htmlFor="confirm-password">
                    Confirm password
                </label>
                <input
                    id="confirm-password"
                    type="password"
                    className="input"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                />
            </div>
            {err && (
                <p className="text-error" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <AlertTriangle size={14} /> {err}
                </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy}>
                <Plus size={15} /> {busy ? 'Generating keypair...' : 'Create wallet'}
            </button>
            <p className="text-muted" style={{ fontSize: 12 }}>
                This generates a new BLS12-381 keypair in your browser. Your private key is encrypted
                with this password and stored only on this device - we never see it.
            </p>
        </form>
    );
}

function ImportWalletForm({ onDone }: { onDone: () => void }): JSX.Element {
    const { importWallet } = useWallet();
    const [nickname, setNickname] = useState('Imported Wallet');
    const [privateKey, setPrivateKey] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const submit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setErr(null);
        const cleaned = privateKey.trim();
        if (!/^(0x)?[0-9a-fA-F]{64}$/.test(cleaned)) {
            setErr('private key must be 64 hex characters (32 bytes)');
            return;
        }
        if (password.length < 8) {
            setErr('password must be at least 8 characters');
            return;
        }
        if (password !== confirm) {
            setErr('passwords do not match');
            return;
        }
        setBusy(true);
        try {
            await importWallet(cleaned, nickname, password);
            onDone();
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'failed to import wallet');
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
                <label className="label" htmlFor="import-nickname">
                    Wallet name
                </label>
                <input
                    id="import-nickname"
                    className="input"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                />
            </div>
            <div>
                <label className="label" htmlFor="private-key">
                    Private key (hex)
                </label>
                <input
                    id="private-key"
                    className="input mono"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="0x..."
                    required
                />
            </div>
            <div>
                <label className="label" htmlFor="import-password">
                    Encrypt with password
                </label>
                <input
                    id="import-password"
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                />
            </div>
            <div>
                <label className="label" htmlFor="import-confirm">
                    Confirm password
                </label>
                <input
                    id="import-confirm"
                    type="password"
                    className="input"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                />
            </div>
            {err && (
                <p className="text-error" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <AlertTriangle size={14} /> {err}
                </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy}>
                <Upload size={15} /> {busy ? 'Importing...' : 'Import wallet'}
            </button>
        </form>
    );
}

function UnlockForm({ address, onDone }: { address: string; onDone: () => void }): JSX.Element {
    const { unlock } = useWallet();
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const submit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setErr(null);
        setBusy(true);
        try {
            await unlock(address, password);
            onDone();
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'failed to unlock');
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
            <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
            />
            <button type="submit" className="btn btn-primary" disabled={busy} style={{ flexShrink: 0 }}>
                <Unlock size={14} /> {busy ? 'Unlocking...' : 'Unlock'}
            </button>
            {err && <p className="text-error">{err}</p>}
        </form>
    );
}

export function WalletPanel(): JSX.Element {
    const { wallets, activeAddress, isUnlocked, loading, lock, selectActiveWallet, removeWallet } =
        useWallet();
    const [mode, setMode] = useState<'idle' | 'create' | 'import'>('idle');

    if (loading) {
        return (
            <div className="card" style={{ padding: 24 }}>
                <p className="text-muted">Loading keystore...</p>
            </div>
        );
    }

    if (wallets.length === 0) {
        return (
            <div className="card" style={{ padding: 24, maxWidth: 420 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                    <Wallet size={20} color="var(--accent)" />
                    <h2 style={{ fontSize: 16 }}>Set up your wallet</h2>
                </div>

                {mode === 'idle' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button className="btn btn-primary" onClick={() => setMode('create')}>
                            <Plus size={15} /> Create new wallet
                        </button>
                        <button className="btn" onClick={() => setMode('import')}>
                            <Upload size={15} /> Import existing wallet
                        </button>
                    </div>
                )}
                {mode === 'create' && <CreateWalletForm onDone={() => setMode('idle')} />}
                {mode === 'import' && <ImportWalletForm onDone={() => setMode('idle')} />}
                {mode !== 'idle' && (
                    <button
                        className="btn btn-ghost"
                        style={{ marginTop: 12, fontSize: 12 }}
                        onClick={() => setMode('idle')}
                    >
                        Back
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="card" style={{ padding: 20, maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Wallet size={18} color="var(--accent)" />
                    <h2 style={{ fontSize: 15 }}>Wallet</h2>
                </div>
                <span className={`badge`} style={!isUnlocked ? { background: 'var(--bg-3)', color: 'var(--text-2)' } : undefined}>
                    {isUnlocked ? 'Unlocked' : 'Locked'}
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {wallets.map((w) => {
                    const isActive = w.address.toLowerCase() === activeAddress?.toLowerCase();
                    return (
                        <div
                            key={w.address}
                            className="card"
                            style={{
                                padding: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderColor: isActive ? 'var(--accent-dim)' : undefined,
                                cursor: isActive ? 'default' : 'pointer'
                            }}
                            onClick={() => !isActive && selectActiveWallet(w.address)}
                        >
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 500 }}>{w.nickname}</p>
                                <p className="mono text-muted" style={{ fontSize: 12 }}>
                                    {shortAddr(w.address)}
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CopyButton value={w.address} />
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-danger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeWallet(w.address);
                                    }}
                                    aria-label="Remove wallet"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {activeAddress && !isUnlocked && <UnlockForm address={activeAddress} onDone={() => {}} />}
            {activeAddress && isUnlocked && (
                <button className="btn" onClick={lock}>
                    <Lock size={14} /> Lock wallet
                </button>
            )}

            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setMode('create')}>
                <Plus size={13} /> Add another wallet
            </button>
            {mode === 'create' && <CreateWalletForm onDone={() => setMode('idle')} />}
            {mode === 'import' && <ImportWalletForm onDone={() => setMode('idle')} />}
        </div>
    );
}
