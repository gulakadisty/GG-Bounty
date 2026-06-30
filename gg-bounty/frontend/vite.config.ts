import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GG Bounty frontend build configuration.
// Talks to two independent Canopy services at runtime (see src/lib/env.ts):
//  - the Canopy node's query/tx RPC (default :50002) for balances, height, tx broadcast
//  - the GG Bounty plugin's custom read-only RPC (default :50010) for bounty/profile data
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': '/src'
        }
    },
    server: {
        port: 5173
    }
});
