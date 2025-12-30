# Environment Variables Setup Guide

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# ============================================
# Firebase Configuration
# ============================================
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_ID=nexafyadb

# Firebase Cloud Messaging (Push Notifications)
VITE_FCM_VAPID_KEY=your_fcm_vapid_key

# ============================================
# Google Gemini AI
# ============================================
VITE_GEMINI_API_KEY=your_gemini_api_key

# ============================================
# M-Pesa Daraja API (Safaricom)
# ============================================
VITE_MPESA_CONSUMER_KEY=your_mpesa_consumer_key
VITE_MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
VITE_MPESA_SHORTCODE=your_mpesa_shortcode
VITE_MPESA_PASSKEY=your_mpesa_passkey
VITE_MPESA_ENVIRONMENT=sandbox

# ============================================
# Tigo Pesa API
# ============================================
VITE_TIGO_PESA_API_KEY=your_tigo_pesa_api_key
VITE_TIGO_PESA_API_SECRET=your_tigo_pesa_api_secret
VITE_TIGO_PESA_MERCHANT_ID=your_tigo_pesa_merchant_id
VITE_TIGO_PESA_ENVIRONMENT=sandbox

# ============================================
# Airtel Money API
# ============================================
VITE_AIRTEL_MONEY_CLIENT_ID=your_airtel_money_client_id
VITE_AIRTEL_MONEY_CLIENT_SECRET=your_airtel_money_client_secret
VITE_AIRTEL_MONEY_MERCHANT_ID=your_airtel_money_merchant_id
VITE_AIRTEL_MONEY_ENVIRONMENT=sandbox

# ============================================
# Stripe Payment Gateway
# ============================================
VITE_STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# ============================================
# PayPal Payment Gateway
# ============================================
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
VITE_PAYPAL_CLIENT_SECRET=your_paypal_client_secret
VITE_PAYPAL_ENVIRONMENT=sandbox

# ============================================
# Lipanamba Payment Gateway (Tanzania)
# ============================================
VITE_LIPANAMBA_API_KEY=your_lipanamba_api_key
VITE_LIPANAMBA_MERCHANT_ID=your_lipanamba_merchant_id
VITE_LIPANAMBA_BASE_URL=https://api.lipanamba.com

# ============================================
# NHIF Integration (Tanzania)
# ============================================
VITE_NHIF_API_KEY=your_nhif_api_key
VITE_NHIF_BASE_URL=https://api.nhif.go.tz

# ============================================
# SMS Service (Choose one: Twilio OR AfricasTalking)
# ============================================
# Twilio
VITE_TWILIO_ACCOUNT_SID=your_twilio_account_sid
VITE_TWILIO_AUTH_TOKEN=your_twilio_auth_token
VITE_TWILIO_PHONE_NUMBER=your_twilio_phone_number

# OR AfricasTalking
VITE_AFRICASTALKING_API_KEY=your_africastalking_api_key
VITE_AFRICASTALKING_USERNAME=your_africastalking_username

# ============================================
# Email Service (Choose one: SendGrid OR AWS SES)
# ============================================
# SendGrid
VITE_SENDGRID_API_KEY=your_sendgrid_api_key

# OR AWS SES
VITE_AWS_SES_ACCESS_KEY=your_aws_ses_access_key
VITE_AWS_SES_SECRET_KEY=your_aws_ses_secret_key
VITE_AWS_SES_REGION=us-east-1

VITE_EMAIL_FROM=noreply@nexafya.com

# ============================================
# Application Configuration
# ============================================
VITE_APP_URL=http://localhost:5174
VITE_APP_NAME=NexaFya
VITE_APP_ENV=development
```

## Getting API Keys

### Firebase
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Go to Project Settings > General
4. Copy the configuration values

### M-Pesa Daraja
1. Register at: https://developer.safaricom.co.ke
2. Create an app to get Consumer Key and Secret
3. Get Shortcode and Passkey from your account

### Tigo Pesa
1. Contact Tigo Pesa for API credentials
2. Register as a merchant

### Airtel Money
1. Contact Airtel Money for API credentials
2. Register as a merchant

### Stripe
1. Sign up at: https://stripe.com
2. Get API keys from Dashboard > Developers > API keys
3. Use test keys for development, live keys for production

### PayPal
1. Sign up at: https://developer.paypal.com
2. Create an app to get Client ID and Secret
3. Use sandbox for testing, production for live

### Lipanamba
1. Contact Lipanamba for merchant account
2. Get API key and Merchant ID from dashboard

### NHIF
1. Contact NHIF Tanzania for API access
2. Register as a healthcare provider
3. Get API key for member verification

### Twilio
1. Sign up at: https://www.twilio.com
2. Get Account SID and Auth Token from dashboard
3. Purchase a phone number

### AfricasTalking
1. Sign up at: https://africastalking.com
2. Get API Key and Username from dashboard

### SendGrid
1. Sign up at: https://sendgrid.com
2. Create API Key in Settings > API Keys

### Google Gemini
1. Go to: https://makersuite.google.com/app/apikey
2. Create API key

## Important Notes

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use different keys for development and production**
3. **Some services require backend implementation** (AWS SES, PayPal)
4. **Payment gateways may require approval** before going live
5. **SMS and Email are optional** but recommended for production

