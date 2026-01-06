# Mock API Implementation Guide

## Overview

All external API services in NexaFya have been configured with **automatic mock mode** that activates when API keys are not configured. This allows the app to run smoothly in development and testing without requiring real API credentials.

## How It Works

### Automatic Detection
- Services check for required environment variables
- If variables are missing, services automatically switch to mock mode
- Mock responses simulate real API behavior with appropriate delays
- Console warnings indicate when mock mode is active

### Mock Features
- ✅ Realistic delays (500ms - 1500ms)
- ✅ Success/failure responses
- ✅ Transaction ID generation
- ✅ Status updates
- ✅ Error handling

## Services with Mock Mode

### 1. Payment Services

#### M-Pesa (`services/mpesaService.ts`)
- **Mock Mode**: Automatically activates when `VITE_MPESA_*` env vars are missing
- **Mock Behavior**: 
  - Returns mock transaction IDs
  - Simulates STK Push requests
  - Status queries return "COMPLETED"

#### Tigo Pesa (`services/tigoPesaService.ts`)
- **Mock Mode**: Activates when `VITE_TIGO_PESA_*` env vars are missing
- **Mock Behavior**: Simulates payment initiation and status queries

#### Airtel Money (`services/airtelMoneyService.ts`)
- **Mock Mode**: Activates when `VITE_AIRTEL_MONEY_*` env vars are missing
- **Mock Behavior**: Simulates payment requests and status checks

#### Stripe (`services/paymentService.ts`)
- **Mock Mode**: Already implemented with simulation mode
- **Mock Behavior**: Creates mock transaction records in Firestore

#### PayPal (`services/paymentService.ts`)
- **Mock Mode**: Already implemented with simulation mode
- **Mock Behavior**: Simulates PayPal order creation

### 2. Communication Services

#### Email Service (`services/emailService.ts`)
- **Mock Mode**: Activates when SendGrid or AWS SES credentials are missing
- **Mock Behavior**: 
  - Logs email details to console
  - Returns success response
  - Simulates 800ms delay

#### SMS Service (`services/smsService.ts`)
- **Mock Mode**: Activates when Twilio or AfricasTalking credentials are missing
- **Mock Behavior**: 
  - Logs SMS details to console
  - Returns success response
  - Simulates 600ms delay

### 3. AI Services

#### Gemini AI (`services/geminiService.ts`)
- **Mock Mode**: Returns helpful messages when API key is missing
- **Mock Behavior**: 
  - Provides user-friendly error messages
  - Suggests consulting healthcare providers
  - Supports both English and Swahili

### 4. Health Services

#### NHIF Service (`services/nhifService.ts`)
- **Mock Mode**: Already implemented
- **Mock Behavior**: 
  - Creates mock NHIF member records
  - Simulates verification process
  - Returns standard benefit coverage

#### Lab Service (`services/labService.ts`)
- **Mock Mode**: Uses Firestore (no external API)
- **Behavior**: Works with Firebase, no mocking needed

## Using Mock Mode

### Development
1. **No Configuration Needed**: Mock mode activates automatically
2. **Console Warnings**: Check browser console for mock mode notifications
3. **Realistic Testing**: Mock responses include delays to simulate real APIs

### Production
1. **Add API Keys**: Configure environment variables in `.env`
2. **Automatic Switch**: Services automatically use real APIs when keys are present
3. **No Code Changes**: Same code works with both mock and real APIs

## Environment Variables

### Payment Services
```env
# M-Pesa
VITE_MPESA_CONSUMER_KEY=your_key
VITE_MPESA_CONSUMER_SECRET=your_secret
VITE_MPESA_SHORTCODE=your_shortcode
VITE_MPESA_PASSKEY=your_passkey

# Tigo Pesa
VITE_TIGO_PESA_API_KEY=your_key
VITE_TIGO_PESA_API_SECRET=your_secret
VITE_TIGO_PESA_MERCHANT_ID=your_merchant_id

# Airtel Money
VITE_AIRTEL_MONEY_CLIENT_ID=your_client_id
VITE_AIRTEL_MONEY_CLIENT_SECRET=your_secret
VITE_AIRTEL_MONEY_MERCHANT_ID=your_merchant_id

# Stripe
VITE_STRIPE_SECRET_KEY=your_secret_key
VITE_STRIPE_PUBLISHABLE_KEY=your_publishable_key

# PayPal
VITE_PAYPAL_CLIENT_ID=your_client_id
VITE_PAYPAL_CLIENT_SECRET=your_secret
```

### Communication Services
```env
# Email (SendGrid)
VITE_SENDGRID_API_KEY=your_key

# OR Email (AWS SES)
VITE_AWS_SES_ACCESS_KEY=your_key
VITE_AWS_SES_SECRET_KEY=your_secret
VITE_AWS_SES_REGION=us-east-1

# SMS (Twilio)
VITE_TWILIO_ACCOUNT_SID=your_sid
VITE_TWILIO_AUTH_TOKEN=your_token
VITE_TWILIO_PHONE_NUMBER=your_number

# OR SMS (AfricasTalking)
VITE_AFRICASTALKING_API_KEY=your_key
VITE_AFRICASTALKING_USERNAME=your_username
```

### AI Services
```env
# Gemini AI
VITE_GEMINI_API_KEY=your_api_key
```

## Mock Utility Functions

Located in `utils/mockApi.ts`:

- `isMockMode()` - Check if mock mode should be used
- `mockDelay()` - Simulate API delay
- `mockSuccess()` - Return successful mock response
- `mockError()` - Return error mock response
- `generateMockTransactionId()` - Generate unique transaction IDs
- `mockPaymentResponse()` - Payment-specific mock response
- `mockSMSResponse()` - SMS-specific mock response
- `mockEmailResponse()` - Email-specific mock response
- `mockHealthData` - Mock health metrics
- `mockLabResults` - Mock lab test results

## Testing with Mock Mode

### Payment Testing
1. Initiate payment without API keys
2. Mock mode activates automatically
3. Transaction records created in Firestore
4. Status shows as "COMPLETED" (mock)

### Communication Testing
1. Send email/SMS without credentials
2. Check console for mock notifications
3. Responses return success immediately

### AI Testing
1. Use symptom checker without API key
2. Receive helpful fallback message
3. App continues to function normally

## Benefits

✅ **No Configuration Required**: App runs immediately  
✅ **Realistic Behavior**: Mock responses include delays  
✅ **Easy Testing**: Test all features without API costs  
✅ **Production Ready**: Same code works with real APIs  
✅ **User Friendly**: Clear messages when services unavailable  

## Console Messages

When mock mode is active, you'll see warnings like:
```
[M-Pesa] Using mock mode - Missing env vars: VITE_MPESA_CONSUMER_KEY, VITE_MPESA_CONSUMER_SECRET
[MOCK] SMS sent to +255712345678 (mock mode): Your verification code is...
[MOCK] Email sent to user@example.com (mock mode): Welcome to NexaFya
```

## Transitioning to Real APIs

1. Add environment variables to `.env`
2. Restart development server
3. Services automatically detect keys
4. Mock mode deactivates
5. Real API calls begin

**No code changes required!**
