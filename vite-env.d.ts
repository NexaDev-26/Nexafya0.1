/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_DATABASE_ID: string
  readonly VITE_FIREBASE_MEASUREMENT_ID: string
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_APP_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_ENV: string
  readonly VITE_MPESA_CONSUMER_KEY: string
  readonly VITE_MPESA_CONSUMER_SECRET: string
  readonly VITE_MPESA_SHORTCODE: string
  readonly VITE_MPESA_PASSKEY: string
  readonly VITE_MPESA_ENVIRONMENT: string
  readonly VITE_TIGO_PESA_API_KEY: string
  readonly VITE_TIGO_PESA_API_SECRET: string
  readonly VITE_TIGO_PESA_MERCHANT_ID: string
  readonly VITE_TIGO_PESA_ENVIRONMENT: string
  readonly VITE_AIRTEL_MONEY_CLIENT_ID: string
  readonly VITE_AIRTEL_MONEY_CLIENT_SECRET: string
  readonly VITE_AIRTEL_MONEY_MERCHANT_ID: string
  readonly VITE_AIRTEL_MONEY_ENVIRONMENT: string
  readonly VITE_STRIPE_SECRET_KEY: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
  readonly VITE_PAYPAL_CLIENT_ID: string
  readonly VITE_PAYPAL_CLIENT_SECRET: string
  readonly VITE_PAYPAL_ENVIRONMENT: string
  readonly VITE_LIPANAMBA_API_KEY: string
  readonly VITE_LIPANAMBA_MERCHANT_ID: string
  readonly VITE_LIPANAMBA_BASE_URL: string
  readonly VITE_NHIF_API_KEY: string
  readonly VITE_NHIF_BASE_URL: string
  readonly VITE_TWILIO_ACCOUNT_SID: string
  readonly VITE_TWILIO_AUTH_TOKEN: string
  readonly VITE_TWILIO_PHONE_NUMBER: string
  readonly VITE_AFRICASTALKING_API_KEY: string
  readonly VITE_AFRICASTALKING_USERNAME: string
  readonly VITE_SENDGRID_API_KEY: string
  readonly VITE_AWS_SES_ACCESS_KEY: string
  readonly VITE_AWS_SES_SECRET_KEY: string
  readonly VITE_AWS_SES_REGION: string
  readonly VITE_EMAIL_FROM: string
  // ... more env variables
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

