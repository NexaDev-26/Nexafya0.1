# How to Deploy Firestore Indexes

## Quick Start

Deploy all indexes to Firebase with one command:

```bash
firebase deploy --only firestore:indexes
```

## Prerequisites

1. **Firebase CLI installed**: 
   ```bash
   npm install -g firebase-tools
   ```

2. **Logged into Firebase**:
   ```bash
   firebase login
   ```

3. **Firebase project initialized** (if not already):
   ```bash
   firebase init firestore
   ```

## Deployment Steps

### 1. Verify Configuration

Check that `firebase.json` references the indexes file:
```json
{
  "firestore": {
    "rules": "firebase/firestore.rules",
    "indexes": "firebase/firestore.indexes.json"
  }
}
```

### 2. Deploy Indexes

Run the deployment command:
```bash
firebase deploy --only firestore:indexes
```

### 3. Wait for Indexes to Build

Indexes take **1-5 minutes** to build. You'll see output like:
```
✔  Deploy complete!

Creating composite index... This may take a minute.
```

### 4. Verify in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Check that all indexes show **"Enabled"** status

## What Gets Deployed?

The `firebase/firestore.indexes.json` file contains **13 composite indexes** for:

- ✅ Doctors (verified, active, sorted by rating)
- ✅ Appointments (by doctor, patient, status, date)
- ✅ Doctor Reviews (by doctor, date)
- ✅ Health Records (by patient, date)
- ✅ Articles (published, by author)
- ✅ Transactions (by user, type, date)

## Index Building Status

You can check index status:

**Via CLI:**
```bash
firebase firestore:indexes
```

**Via Console:**
- Go to Firestore → Indexes tab
- Status shows as:
  - 🟢 **Enabled** - Ready to use
  - 🟡 **Building** - In progress (wait 1-5 min)
  - 🔴 **Error** - Check error message

## Common Issues

### Issue: "Index already exists"
✅ **This is fine!** Firebase will skip existing indexes.

### Issue: "Permission denied"
**Solution:** Make sure you're logged in and have the correct project selected:
```bash
firebase login
firebase use <your-project-id>
```

### Issue: "Index limit exceeded"
**Solution:** Free tier allows 200 indexes. Consider:
- Removing unused indexes
- Combining similar queries
- Upgrading to Blaze plan

### Issue: Query still fails after deploying
**Possible causes:**
1. Index is still building (wait 1-5 minutes)
2. Query doesn't match index exactly (check field order)
3. Using `!=` operator (can't be indexed, filter client-side)

## Testing After Deployment

After indexes are built, test your queries:

1. **Load doctors list** - Should show verified doctors sorted by rating
2. **Book appointment** - Should check availability correctly
3. **View appointments** - Should load patient/doctor appointments quickly
4. **Check reviews** - Should load doctor reviews sorted by date

## Automatic Deployment (CI/CD)

Add to your deployment script:

```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore:rules,firestore:indexes
```

Or in GitHub Actions / GitLab CI:

```yaml
- name: Deploy Firestore Indexes
  run: firebase deploy --only firestore:indexes --token ${{ secrets.FIREBASE_TOKEN }}
```

## Need More Help?

📚 **Full Guide**: See `FIRESTORE_INDEXES_GUIDE.md`
🔗 **Firebase Docs**: https://firebase.google.com/docs/firestore/query-data/indexing
