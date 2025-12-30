# NexaFya Telemedicine Ecosystem

NexaFya is a comprehensive, medical-grade digital health ecosystem connecting patients, doctors, pharmacies, and community health workers. It features AI-powered symptom checking, real-time video consultations, and integrated pharmaceutical logistics.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Lucide Icons
- **Backend**: Firebase (Firestore, Auth, Storage, Functions)
- **AI**: Google Gemini API
- **Deployment**: Vercel-ready

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   See [ENV_SETUP.md](./ENV_SETUP.md) for complete environment variable configuration.
   
   Minimum required for local development:
   - Firebase configuration (already configured in `lib/firebase.ts`)
   - Gemini API key (optional, for AI features)

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Build for Production**:
   ```bash
   npm run build
   ```

## Deployment

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed deployment instructions, or [QUICK_DEPLOY_TEST.md](./QUICK_DEPLOY_TEST.md) for quick testing deployment.

## Key Features

- ✅ User Authentication (Firebase Auth)
- ✅ Real-time Database (Firestore)
- ✅ AI-Powered Symptom Checker (Gemini AI)
- ✅ Video Consultations (WebRTC)
- ✅ E-Prescriptions
- ✅ Trust Tier System for Doctors/Couriers
- ✅ Payment Integration (M-Pesa, Stripe, PayPal, etc.)
- ✅ NHIF Integration
- ✅ Lab Test Booking
- ✅ Support Tickets
- ✅ Verification System
- ✅ And much more!

## Git Initialization & Push

To push this project to your GitHub repository, run the following commands in your terminal:

```bash
# 1. Initialize Git
git init

# 2. Add all files
git add .

# 3. Commit changes
git commit -m "Initial commit: NexaFya Full-Stack Telemedicine App"

# 4. Link to Remote Repository
git remote add origin https://github.com/NexaDev-26/Nexafya.git

# 5. Rename branch to main
git branch -M main

# 6. Push to GitHub
git push -u origin main
```

## Features

- **Patients**: AI Symptom Checker, Appointment Booking, Medical History.
- **Doctors**: Patient Management, Article Publishing, Consultation Schedule.
- **Pharmacy**: Inventory Management, Order Dispatch, Courier Tracking.
- **Admin**: System Analytics, Revenue Tracking.
