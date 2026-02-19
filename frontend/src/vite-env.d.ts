/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_CLOUDFRONT_DISTRIBUTION_ID: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_AUTH_DOMAIN: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
