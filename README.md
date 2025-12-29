# NexaFya Telemedicine Ecosystem

NexaFya is a comprehensive, medical-grade digital health ecosystem connecting patients, doctors, pharmacies, and community health workers. It features AI-powered symptom checking, real-time video consultations, and integrated pharmaceutical logistics.

## Tech Stack

- **Frontend**: React, TailwindCSS, Lucide Icons, Google Gemini AI
- **Backend**: Node.js, Express.js
- **Database**: MySQL, Prisma ORM
- **AI**: Google Gemini API

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Setup**:
    Create a `.env` file and add your keys:
    ```env
    API_KEY=your_google_gemini_api_key
    DATABASE_URL="mysql://user:password@localhost:3306/nexafya"
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

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
