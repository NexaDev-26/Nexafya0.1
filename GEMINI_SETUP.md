# Gemini AI Setup Guide

## Quick Setup

Your Gemini API key has been configured! Here's how to use it:

### 1. Environment Variable Setup

The API key is already hardcoded in `services/geminiService.ts` for quick setup. However, for production, you should use environment variables.

**Create a `.env` file in the root directory:**

```env
VITE_GEMINI_API_KEY=AIzaSyBcB8-7RTl9IjJDpffY_8Dt13_offWNYOI
```

**Important:** The `.env` file is already in `.gitignore` to keep your API key secure.

### 2. Restart Development Server

After creating/updating the `.env` file, restart your development server:

```bash
npm run dev
```

### 3. Available AI Features

The Gemini AI is integrated into the following features:

#### ✅ Symptom Checker (`components/SymptomChecker.tsx`)
- Conversational AI symptom assessment
- Triage recommendations (Emergency, Doctor, SelfCare, Info)
- Multi-language support (English/Swahili)

#### ✅ Article Generation (`components/Articles.tsx`)
- AI-powered content generation
- Medical article writing assistance

### 4. Available Functions

#### `assessSymptoms(history, language)`
Analyzes symptoms and provides triage assessment.

```typescript
import { assessSymptoms } from '../services/geminiService';

const assessment = await assessSymptoms([
  { role: 'user', text: 'I have a headache and fever' }
], 'en');
```

#### `checkSymptoms(prompt, language)`
Generates medical content based on a prompt.

```typescript
import { checkSymptoms } from '../services/geminiService';

const content = await checkSymptoms('Write about diabetes prevention', 'en');
```

#### `generateArticleContent(topic, language, targetLength)`
Generates comprehensive health articles.

```typescript
import { generateArticleContent } from '../services/geminiService';

const article = await generateArticleContent(
  'Hypertension Management',
  'en',
  'medium' // 'short' | 'medium' | 'long'
);
```

#### `generateHealthTips(category, language, count)`
Generates practical health tips.

```typescript
import { generateHealthTips } from '../services/geminiService';

const tips = await generateHealthTips('Nutrition', 'en', 5);
// Returns: ['Tip 1', 'Tip 2', ...]
```

#### `analyzePrescription(prescriptionText, language)`
Extracts structured data from prescription text.

```typescript
import { analyzePrescription } from '../services/geminiService';

const analysis = await analyzePrescription(
  'Dr. Smith\nParacetamol 500mg\nTake 2 tablets every 6 hours for 3 days',
  'en'
);
// Returns: { medications: [...], doctorName: 'Dr. Smith', ... }
```

#### `translateMedicalContent(text, targetLanguage)`
Translates medical content accurately.

```typescript
import { translateMedicalContent } from '../services/geminiService';

const translated = await translateMedicalContent(
  'Take medication with food',
  'sw' // Swahili
);
```

### 5. Models Used

- **gemini-1.5-flash**: Fast, efficient for most tasks
- **gemini-3-flash-preview**: Latest preview model (used in symptom checker)

### 6. Error Handling

All functions include error handling and will return fallback messages if:
- API key is missing
- Network errors occur
- API rate limits are exceeded

### 7. Security Best Practices

1. ✅ **Never commit API keys to Git** - `.env` is in `.gitignore`
2. ✅ **Use environment variables** - For production, use `.env.production`
3. ✅ **Rotate keys regularly** - If a key is exposed, generate a new one
4. ✅ **Monitor usage** - Check Google AI Studio for usage statistics

### 8. Getting a New API Key

If you need a new API key:

1. Visit: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and update your `.env` file

### 9. Testing the Integration

Test the AI integration:

1. Open the app: `http://localhost:5174`
2. Navigate to **Symptom Checker** or **Health Resources**
3. Try asking a health question
4. The AI should respond with medical guidance

### 10. Troubleshooting

**Issue: "AI service is not configured"**
- Solution: Check that `VITE_GEMINI_API_KEY` is set in `.env`
- Restart the dev server after adding the key

**Issue: "AI Service unavailable"**
- Solution: Check your internet connection
- Verify the API key is valid at https://aistudio.google.com/app/apikey
- Check API quota/limits in Google Cloud Console

**Issue: Rate limit errors**
- Solution: The free tier has rate limits. Consider upgrading or implementing request throttling

### 11. Production Deployment

For production:

1. Set environment variables in your hosting platform (Vercel, Netlify, etc.)
2. Use `.env.production` for production-specific keys
3. Enable API key restrictions in Google Cloud Console
4. Monitor usage and costs

### 12. Cost Management

- Free tier: 15 requests per minute
- Monitor usage: https://aistudio.google.com/app/apikey
- Set up billing alerts in Google Cloud Console

---

**Your API Key:** `AIzaSyBcB8-7RTl9IjJDpffY_8Dt13_offWNYOI`

**Status:** ✅ Configured and ready to use!

