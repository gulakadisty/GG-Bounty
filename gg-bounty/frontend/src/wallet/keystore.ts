/**
 * Password-encrypted private key storage, using only the browser's native WebCrypto API
 * (no extra crypto dependency for the encryption-at-rest layer - this is independent of the
 * BLS signing scheme in bls.ts, which is a separate, chain-specific concern).
 *
 * Scheme: PBKDF2-SHA256 (210,000 iterations, random 16-byte salt) derives an AES-256 key from
 * the user's password; AES-256-GCM (random 12-byte IV) encrypts the raw 32-byte BLS private key.
 * Nothing plaintext-sensitive is ever persisted - only this EncryptedKeystoreEntry shape.
 */

import { bytesToHex, hexToBytes } from '../lib/bytes';

const PBKDF2_ITERATIONS = 210_000;

export interface EncryptedKeystoreEntry {
    version: 1;
    nickname: string;
    address: string; // hex, 20 bytes
    publicKey: string; // hex
    kdf: 'PBKDF2-SHA256';
    iterations: number;
    salt: string; // hex, 16 bytes
    iv: string; // hex, 12 bytes
    ciphertext: string; // hex, AES-GCM(privateKey) with auth tag appended
    createdAt: number;
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/** Encrypt a raw private key with a user password into a storable keystore entry. */
export async function encryptKeystoreEntry(
    nickname: string,
    publicKey: Uint8Array,
    address: Uint8Array,
    privateKey: Uint8Array,
    password: string
): Promise<EncryptedKeystoreEntry> {
    if (password.length < 8) {
        throw new Error('password must be at least 8 characters');
    }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aesKey = await deriveAesKey(password, salt);
    const ciphertextBuf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        privateKey.buffer.slice(privateKey.byteOffset, privateKey.byteOffset + privateKey.byteLength)
    );

    return {
        version: 1,
        nickname,
        address: bytesToHex(address),
        publicKey: bytesToHex(publicKey),
        kdf: 'PBKDF2-SHA256',
        iterations: PBKDF2_ITERATIONS,
        salt: bytesToHex(salt),
        iv: bytesToHex(iv),
        ciphertext: bytesToHex(new Uint8Array(ciphertextBuf)),
        createdAt: Date.now()
    };
}

/**
 * Decrypt a keystore entry with the user's password, returning the raw private key.
 * Throws if the password is wrong (AES-GCM authentication failure).
 */
export async function decryptKeystoreEntry(
    entry: EncryptedKeystoreEntry,
    password: string
): Promise<Uint8Array> {
    const salt = hexToBytes(entry.salt);
    const iv = hexToBytes(entry.iv);
    const ciphertext = hexToBytes(entry.ciphertext);
    const aesKey = await deriveAesKey(password, salt);
    try {
        const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext);
        return new Uint8Array(plainBuf);
    } catch {
        throw new Error('incorrect password');
    }
}
