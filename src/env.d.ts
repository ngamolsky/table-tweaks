/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GAME_ASSETS_BUCKET: string;
    // ... other env variables
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
