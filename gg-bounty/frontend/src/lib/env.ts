/**
 * Runtime configuration for the three independent services GG Bounty talks to.
 *
 * These are NOT the same service:
 *  - CANOPY_RPC_URL   -> the Canopy node's query/tx RPC (cmd/rpc). Balances, height,
 *                         tx broadcast (`/v1/tx`), tx history. Default Canopy port 50002.
 *  - PLUGIN_RPC_URL   -> the GG Bounty plugin's own read-only HTTP server
 *                         (src/contract/rpc.ts in plugin/typescript). Bounty/profile/submission
 *                         queries. Configured via the plugin's `rpcAddress` (default :50010).
 *  - ADMIN_RPC_URL    -> the Canopy node's admin/keystore RPC (default 50003). GG Bounty's
 *                         frontend wallet does NOT use this (see WalletContext) - it's kept
 *                         only because some local dev/test tooling may still reference it.
 *
 * All three are configurable via Vite env vars so the same build can point at different
 * local/dev deployments without code changes.
 */

function readEnv(key: string, fallback: string): string {
    const value = (import.meta.env as Record<string, string | undefined>)[key];
    return value && value.length > 0 ? value : fallback;
}

export const CANOPY_RPC_URL = readEnv('VITE_CANOPY_RPC_URL', 'http://localhost:50002');
export const PLUGIN_RPC_URL = readEnv('VITE_PLUGIN_RPC_URL', 'http://localhost:50010');
export const ADMIN_RPC_URL = readEnv('VITE_ADMIN_RPC_URL', 'http://localhost:50003');

// NETWORK_ID / CHAIN_ID must match the Canopy node + plugin's configured chain.
// Mirrors NETWORK_ID/CHAIN_ID in plugin/typescript/tutorial/src/rpc_test.ts.
export const NETWORK_ID = BigInt(readEnv('VITE_NETWORK_ID', '1'));
export const CHAIN_ID = BigInt(readEnv('VITE_CHAIN_ID', '1'));
