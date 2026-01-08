/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_BACKEND_URL: string
    readonly VITE_PAYPAL_CLIENT_ID: string
    readonly VITE_PORTONE_STORE_ID: string
    readonly VITE_PORTONE_CHANNEL_KEY: string
    readonly VITE_APP_VERSION: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
