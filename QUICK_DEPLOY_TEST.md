# Quick Deploy to Test - Minimal Setup

This guide helps you deploy NexaFya to Vercel **right now** for testing, even without all API keys. The app will work in "simulation mode" for missing services.

## ✅ Required Environment Variables (Minimum)

These are **absolutely required** for the app to function:

### Firebase Configuration (REQUIRED)
```
VITE_FIREBASE_API_KEY=AIzaSyA6R40s-SVIKfjOQ-7-q8fXNBD7TrwQ9qo
VITE_FIREBASE_AUTH_DOMAIN=nexafya.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nexafya
VITE_FIREBASE_STORAGE_BUCKET=nexafya.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123250180152
VITE_FIREBASE_APP_ID=1:123250180152:web:5718f4ba4bb477ef0d66cd
VITE_FIREBASE_DATABASE_ID=nexafyadb
VITE_FIREBASE_MEASUREMENT_ID=G-5QL5G79198
```

### Application Configuration (REQUIRED)
```
VITE_APP_URL=https://your-app.vercel.app
VITE_APP_NAME=NexaFya
VITE_APP_ENV=production
```

## ⚠️ Optional Environment Variables (Will Use Simulation Mode)

These can be added later. The app will work without them:

### Google Gemini AI (Already Configured!)
```
VITE_GEMINI_API_KEY=AIzaSyBcB8-7RTl9IjJDpffY_8Dt13_offWNYOI
```
**Note**: ✅ This key is already configured! AI features will work automatically.

### Payment Gateways (Optional - Payments will use simulation)
- M-Pesa, Tigo Pesa, Airtel Money, Stripe, PayPal, Lipanamba
- **Without these**: Payment flows will show simulation mode messages

### SMS/Email Services (Optional - Notifications will be in-app only)
- Twilio, AfricasTalking, SendGrid, AWS SES
- **Without these**: Users will only see in-app notifications (no SMS/Email)

### NHIF Integration (Optional)
- **Without this**: NHIF verification will use simulation mode

## 🚀 Quick Deploy Steps

### Step 1: Prepare Your Code

```bash
# Make sure everything is committed
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. **Add ONLY the required variables above** (Firebase + App Config)
5. Add your Gemini API key if you want AI features
6. Click **"Deploy"**

#### Option B: Via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (will ask questions)
vercel

# When asked about environment variables, skip for now
# You can add them later in the dashboard
```

### Step 3: Add Environment Variables in Vercel Dashboard

After deployment:

1. Go to your project in Vercel dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add the **required variables** listed above
4. Add **optional variables** as you get them
5. Click **"Redeploy"** after adding variables

### Step 4: Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add your Vercel domain: `your-app.vercel.app`
5. This allows Firebase Auth to work on your deployed site

### Step 5: Test Your Deployment

Visit `https://your-app.vercel.app` and test:

- ✅ User registration/login (Firebase Auth)
- ✅ Viewing articles
- ✅ Creating appointments
- ✅ Profile management
- ⚠️ Payments (will show simulation mode)
- ⚠️ AI features (will work if Gemini key is added)
- ⚠️ SMS/Email (in-app notifications only)

## 📝 What Works Without API Keys

### ✅ Fully Functional
- User authentication (Firebase)
- Database operations (Firestore)
- File uploads (Firebase Storage)
- All UI components
- Article reading
- Appointment booking
- Profile management
- Trust Tier system
- Verification system

### ⚠️ Simulation Mode (Works but Limited)
- **Payments**: Will show "simulation mode" messages
- **AI Features**: Limited if Gemini key not added
- **SMS/Email**: Only in-app notifications
- **NHIF**: Uses mock data for verification

## 🔄 Adding More API Keys Later

You can add API keys anytime without redeploying:

1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Add the new variable
3. Click **"Redeploy"** (or it will auto-redeploy on next push)

The app will automatically switch from simulation mode to real API calls once keys are added.

## 🎯 Minimal Test Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Firebase config variables added to Vercel
- [ ] App config variables added to Vercel
- [ ] Firebase authorized domains updated
- [ ] Deployed successfully
- [ ] Can register/login
- [ ] Can view articles
- [ ] Can create appointments

## 💡 Pro Tips

1. **Start with Firebase only** - This is enough to test core functionality
2. **Add Gemini key** - You already have it, add it for AI features
3. **Test core features first** - Authentication, database, UI
4. **Add payment keys later** - When ready to test payments
5. **Use Preview deployments** - Test changes before production

## 🐛 Troubleshooting

### "Firebase auth domain not authorized"
- **Fix**: Add your Vercel domain to Firebase authorized domains

### "Environment variable not found"
- **Fix**: Add the variable in Vercel dashboard → Settings → Environment Variables

### "Build failed"
- **Fix**: Check build logs in Vercel dashboard
- Common issues: Missing dependencies, TypeScript errors

### "App loads but Firebase doesn't work"
- **Fix**: Verify all Firebase environment variables are correct
- Check Firebase console for errors

## 📦 Example Minimal .env for Testing

Create this locally to test before deploying:

```env
# Firebase (REQUIRED)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_ID=nexafyadb

# App Config (REQUIRED)
VITE_APP_URL=http://localhost:5174
VITE_APP_NAME=NexaFya
VITE_APP_ENV=development

# Gemini AI (OPTIONAL - but you have the key!)
VITE_GEMINI_API_KEY=AIzaSyBcB8-7RTl9IjJDpffY_8Dt13_offWNYOI
```

## 🎉 You're Ready!

With just Firebase config, you can:
- Deploy to Vercel
- Test user authentication
- Test database operations
- Test all UI features
- See the app in action

Add more API keys as you get them - the app will automatically use them!

