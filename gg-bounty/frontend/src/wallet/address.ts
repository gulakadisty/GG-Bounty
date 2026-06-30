/**
 * Canopy address derivation.
 *
 * plugin/typescript/TUTORIAL.md ("Common Issues" -> "Invalid signature errors") states the
 * address derivation must match: "SHA256 -> first 20 bytes". An Account's `address` field
 * (proto/account.proto) is documented as "the short version of a public key" - i.e. it is
 * NOT the raw public key, it's a 20-byte digest of it. All `*_address` fields throughout
 * tx.proto (from_address, signer_address, admin_address, recipient_address, ...) are validated
 * elsewhere in the plugin as `.length === 20`, confirming the 20-byte convention.
 */

import { sha256 } from '@noble/hashes/sha256';

/** Derive the 20-byte Canopy address from a raw public key. */
export function addressFromPublicKey(publicKey: Uint8Array): Uint8Array {
    const digest = sha256(publicKey);
    return digest.slice(0, 20);
}
