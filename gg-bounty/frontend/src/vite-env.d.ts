/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_CANOPY_RPC_URL?: string;
    readonly VITE_PLUGIN_RPC_URL?: string;
    readonly VITE_ADMIN_RPC_URL?: string;
    readonly VITE_NETWORK_ID?: string;
    readonly VITE_CHAIN_ID?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
