/// <reference types="vite/client" />

// Mux Video Web Component type declaration
declare namespace JSX {
    interface IntrinsicElements {
        'mux-video': React.DetailedHTMLProps<React.HTMLAttributes<HTMLVideoElement>, HTMLVideoElement> & {
            'playback-id'?: string;
            autoplay?: boolean;
            loop?: boolean;
            muted?: boolean;
            playsinline?: boolean;
            controls?: boolean;
            preload?: string;
            poster?: string;
        };
    }
}

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
