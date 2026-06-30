/**
 * BLS12-381 key generation and signing.
 *
 * This mirrors plugin/typescript/tutorial/src/rpc_test.ts `signBLS()` exactly:
 *   - "long signatures" variant (G2 signatures), matching the Go node's kyber bdn.Scheme
 *   - DST: BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_ (built into @noble/curves' longSignatures)
 *   - Same library (@noble/curves/bls12-381) the tutorial itself uses for test signing,
 *     so signatures produced here are verified by the same code path Canopy already exercises.
 *
 * NOTE: @noble/curves is not installed in the sandbox this code was written in (no network
 * access - see conversation). The `longSignatures.{hash,sign,Signature}` calls below are
 * copied verbatim from the tutorial's working implementation. `getPublicKey` / `PublicKey`
 * are the standard counterparts in the same noble-curves BLS namespace, but since I can't
 * execute this against the real installed package here, please run `npm install` and
 * `npm run dev`, and if the actual @noble/curves API differs (e.g. a renamed export), paste
 * me the TypeScript error and I'll fix it immediately - this is exactly the kind of thing
 * the "verify TypeScript compilation" step in our workflow exists to catch.
 */

import { bls12_381 } from '@noble/curves/bls12-381';
import { addressFromPublicKey } from './address';

export interface KeyPair {
    privateKey: Uint8Array; // 32 bytes
    publicKey: Uint8Array; // G1 public key bytes (long-signature scheme)
    address: Uint8Array; // 20 bytes, sha256(publicKey)[:20]
}

/** Generate a brand-new BLS12-381 keypair using a CSPRNG. */
export function generateKeyPair(): KeyPair {
    const privateKey = bls12_381.utils.randomPrivateKey();
    return keyPairFromPrivateKey(privateKey);
}

/** Reconstruct a keypair (and address) from an existing private key, e.g. on import. */
export function keyPairFromPrivateKey(privateKey: Uint8Array): KeyPair {
    if (privateKey.length !== 32) {
        throw new Error('invalid private key: expected 32 bytes');
    }
    const pubPoint = bls12_381.longSignatures.getPublicKey(privateKey);
    const publicKey = bls12_381.longSignatures.PublicKey.toBytes(pubPoint);
    const address = addressFromPublicKey(publicKey);
    return { privateKey, publicKey, address };
}

/**
 * Sign arbitrary bytes (the deterministic protobuf-encoded Transaction, signature field
 * omitted - see tx.ts) with the long-signature (G2) BLS scheme.
 */
export function signBLS(privateKey: Uint8Array, message: Uint8Array): Uint8Array {
    const hashedPoint = bls12_381.longSignatures.hash(message);
    const signaturePoint = bls12_381.longSignatures.sign(hashedPoint, privateKey);
    return bls12_381.longSignatures.Signature.toBytes(signaturePoint);
}
