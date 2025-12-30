# Deploying NexaFya to Vercel

This guide will walk you through deploying your NexaFya application to Vercel.

> **🚀 Quick Start**: Want to deploy NOW for testing? See [QUICK_DEPLOY_TEST.md](./QUICK_DEPLOY_TEST.md) for minimal setup with just Firebase!

## Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (free tier available)
3. **Environment Variables** - At minimum, Firebase config is required. Other API keys can be added later (see [QUICK_DEPLOY_TEST.md](./QUICK_DEPLOY_TEST.md))

## Step 1: Prepare Your Repository

### 1.1 Ensure Your Code is Committed

```bash
# Check git status
git status

# If you have uncommitted changes, commit them
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 1.2 Verify Build Works Locally

```bash
# Install dependencies
npm install

# Test the build
npm run build

# If build succeeds, you're ready!
```

## Step 2: Create Vercel Configuration

Create a `vercel.json` file in your project root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## Step 3: Deploy via Vercel Dashboard

### 3.1 Import Your Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub repository (`nexafya0.1`)
5. Click **"Import"**

### 3.2 Configure Project Settings

Vercel will auto-detect Vite. Configure:

- **Framework Preset**: Vite
- **Root Directory**: `./` (leave as default)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `dist` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### 3.3 Add Environment Variables

**IMPORTANT**: Add all your environment variables before deploying!

1. In the project configuration, scroll to **"Environment Variables"**
2. Add each variable from your `.env` file:

#### Firebase Configuration
```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_ID=nexafyadb
VITE_FCM_VAPID_KEY=your_fcm_vapid_key
```

#### Google Gemini AI
```
VITE_GEMINI_API_KEY=your_gemini_api_key
```

#### M-Pesa Daraja API
```
VITE_MPESA_CONSUMER_KEY=your_mpesa_consumer_key
VITE_MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
VITE_MPESA_SHORTCODE=your_mpesa_shortcode
VITE_MPESA_PASSKEY=your_mpesa_passkey
VITE_MPESA_ENVIRONMENT=sandbox
```

#### Tigo Pesa API
```
VITE_TIGO_PESA_API_KEY=your_tigo_pesa_api_key
VITE_TIGO_PESA_API_SECRET=your_tigo_pesa_api_secret
VITE_TIGO_PESA_MERCHANT_ID=your_tigo_pesa_merchant_id
VITE_TIGO_PESA_ENVIRONMENT=sandbox
```

#### Airtel Money API
```
VITE_AIRTEL_MONEY_CLIENT_ID=your_airtel_money_client_id
VITE_AIRTEL_MONEY_CLIENT_SECRET=your_airtel_money_client_secret
VITE_AIRTEL_MONEY_MERCHANT_ID=your_airtel_money_merchant_id
VITE_AIRTEL_MONEY_ENVIRONMENT=sandbox
```

#### Stripe Payment Gateway
```
VITE_STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

#### PayPal Payment Gateway
```
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
VITE_PAYPAL_CLIENT_SECRET=your_paypal_client_secret
VITE_PAYPAL_ENVIRONMENT=sandbox
```

#### Lipanamba Payment Gateway
```
VITE_LIPANAMBA_API_KEY=your_lipanamba_api_key
VITE_LIPANAMBA_MERCHANT_ID=your_lipanamba_merchant_id
VITE_LIPANAMBA_BASE_URL=https://api.lipanamba.com
```

#### NHIF Integration
```
VITE_NHIF_API_KEY=your_nhif_api_key
VITE_NHIF_BASE_URL=https://api.nhif.go.tz
```

#### SMS Service (Choose one)
```
# Twilio
VITE_TWILIO_ACCOUNT_SID=your_twilio_account_sid
VITE_TWILIO_AUTH_TOKEN=your_twilio_auth_token
VITE_TWILIO_PHONE_NUMBER=your_twilio_phone_number

# OR AfricasTalking
VITE_AFRICASTALKING_API_KEY=your_africastalking_api_key
VITE_AFRICASTALKING_USERNAME=your_africastalking_username
```

#### Email Service (Choose one)
```
# SendGrid
VITE_SENDGRID_API_KEY=your_sendgrid_api_key

# OR AWS SES
VITE_AWS_SES_ACCESS_KEY=your_aws_ses_access_key
VITE_AWS_SES_SECRET_KEY=your_aws_ses_secret_key
VITE_AWS_SES_REGION=us-east-1
VITE_EMAIL_FROM=noreply@nexafya.com
```

#### Application Configuration
```
VITE_APP_URL=https://your-app.vercel.app
VITE_APP_NAME=NexaFya
VITE_APP_ENV=production
```

**Note**: 
- Add variables for **Production**, **Preview**, and **Development** environments
- Use production API keys for Production environment
- Use sandbox/test keys for Preview and Development

### 3.4 Deploy

1. Click **"Deploy"** button
2. Wait for the build to complete (usually 2-5 minutes)
3. Your app will be live at `https://your-app.vercel.app`

## Step 4: Deploy via Vercel CLI (Alternative Method)

### 4.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 4.2 Login to Vercel

```bash
vercel login
```

### 4.3 Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 4.4 Add Environment Variables via CLI

```bash
# Add a single variable
vercel env add VITE_FIREBASE_API_KEY production

# Or add from .env file (you'll need to create a script)
```

## Step 5: Configure Firebase for Production

### 5.1 Update Firebase Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add your Vercel domain: `your-app.vercel.app`
5. Add your custom domain if you have one

### 5.2 Update Firestore Security Rules

Ensure your Firestore rules allow requests from your production domain:

```javascript
// firebase/firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Your existing rules...
    // They should work as-is since they use request.auth.uid
  }
}
```

### 5.3 Update Firebase Storage Rules

1. Go to **Storage** → **Rules**
2. Ensure rules allow authenticated users from your domain

## Step 6: Post-Deployment Checklist

### 6.1 Test Your Deployment

- [ ] Visit your Vercel URL
- [ ] Test user registration/login
- [ ] Test Firebase authentication
- [ ] Test Firestore read/write operations
- [ ] Test file uploads to Firebase Storage
- [ ] Test payment flows (use test/sandbox keys)
- [ ] Test notifications
- [ ] Test all major features

### 6.2 Set Up Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain (e.g., `nexafya.com`)
3. Follow DNS configuration instructions
4. Update `VITE_APP_URL` environment variable

### 6.3 Configure Production Environment Variables

1. In Vercel dashboard, go to **Settings** → **Environment Variables**
2. Update all variables for **Production** environment
3. Use production API keys (not sandbox/test keys)

### 6.4 Enable Automatic Deployments

- **Production**: Deploys automatically when you push to `main` branch
- **Preview**: Deploys automatically for pull requests
- **Development**: Deploys automatically for other branches

## Step 7: Monitoring and Updates

### 7.1 View Deployment Logs

1. Go to Vercel dashboard
2. Click on your project
3. Click on a deployment to see logs

### 7.2 Update Your App

```bash
# Make changes
git add .
git commit -m "Update app"
git push origin main

# Vercel will automatically deploy
```

### 7.3 Rollback to Previous Version

1. Go to Vercel dashboard
2. Click on your project
3. Go to **Deployments**
4. Find the deployment you want
5. Click **"..."** → **"Promote to Production"**

## Troubleshooting

### Build Fails

**Error**: `Module not found` or `Cannot resolve`
- **Solution**: Ensure all dependencies are in `package.json`
- Run `npm install` locally and commit `package-lock.json`

**Error**: `Environment variable not found`
- **Solution**: Add all required environment variables in Vercel dashboard

**Error**: `Firebase configuration error`
- **Solution**: Verify all Firebase environment variables are set correctly

### Runtime Errors

**Error**: `Firebase auth domain not authorized`
- **Solution**: Add your Vercel domain to Firebase authorized domains

**Error**: `CORS error`
- **Solution**: Check Firebase CORS settings and Vercel headers configuration

**Error**: `API key invalid`
- **Solution**: Verify environment variables are set for Production environment

### Performance Issues

- Enable Vercel Analytics in dashboard
- Check bundle size with `npm run build -- --analyze`
- Optimize images and assets
- Use Vercel's Edge Functions if needed

## Security Best Practices

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use different keys for production and development**
3. **Enable Vercel's Security Headers**
4. **Regularly rotate API keys**
5. **Monitor Vercel logs for suspicious activity**
6. **Use Vercel's DDoS protection** (included in Pro plan)

## Cost Considerations

### Vercel Free Tier Includes:
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Custom domains
- ✅ Preview deployments

### Upgrade to Pro ($20/month) for:
- More bandwidth
- Team collaboration
- Advanced analytics
- Priority support

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#vercel)
- [Firebase Hosting Alternative](https://firebase.google.com/docs/hosting)

## Quick Deploy Command

```bash
# One-time setup
npm install -g vercel
vercel login

# Deploy
vercel --prod
```

---

**Need Help?** Check Vercel's [documentation](https://vercel.com/docs) or [support](https://vercel.com/support).

