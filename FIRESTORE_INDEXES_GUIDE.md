# Firestore Indexes Guide

## Why Indexes Are Needed

Firestore requires **composite indexes** when you:
1. Use multiple `where` clauses on different fields
2. Combine `where` clauses with `orderBy` on a different field
3. Use range queries (`>`, `<`, `>=`, `<=`) with equality or orderBy

Without indexes, Firestore queries will fail with an error asking you to create the index.

## Indexes Created in This Project

The `firebase/firestore.indexes.json` file contains all necessary indexes for optimal query performance.

### Main Indexes:

1. **Doctors Collection**
   - `verificationStatus` + `isActive` + `rating` (desc) - For filtering verified, active doctors sorted by rating
   - `isActive` + `rating` (desc) - Fallback for active doctors sorted by rating

2. **Appointments Collection**
   - `doctorId` + `scheduledAt` + `status` - For doctor's appointments on a date with status filter
   - `doctorId` + `scheduledAt` - For doctor's appointments on a date
   - `patientId` + `scheduledAt` (desc) - For patient's appointments sorted by date
   - `patientId` + `status` + `scheduledAt` (desc) - For patient's completed appointments

3. **Doctor Reviews Collection**
   - `doctorId` + `createdAt` (desc) - For doctor reviews sorted by date
   - `doctorId` + `patientId` - For checking if patient already reviewed a doctor

4. **Health Records Collection**
   - `patientId` + `recordedAt` (desc) - For patient's health records sorted by date

5. **Articles Collection**
   - `published` + `createdAt` (desc) - For published articles sorted by date
   - `authorId` + `createdAt` (desc) - For author's articles sorted by date

6. **Transactions Collection**
   - `userId` + `createdAt` (desc) - For user's transactions sorted by date
   - `userId` + `type` + `createdAt` (desc) - For filtered user transactions

## How to Deploy Indexes

### Method 1: Using Firebase CLI (Recommended)

```bash
# Deploy all indexes
firebase deploy --only firestore:indexes

# Or if you're in the firebase directory
cd firebase
firebase deploy --only firestore:indexes
```

### Method 2: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **"Create Index"**
5. Copy the index definition from `firebase/firestore.indexes.json`
6. Fill in the fields manually

### Method 3: Automatic (When Error Occurs)

When a query fails, Firestore will show an error with a link to create the index:
1. Click the link in the error message
2. It will open Firebase Console with the index pre-filled
3. Click "Create Index"

## How to Verify Indexes

1. **Firebase Console**: Go to Firestore → Indexes tab
2. **Firebase CLI**: Run `firebase firestore:indexes`
3. Check build logs: Indexes are automatically created during deployment

## Index Status

Indexes can have different statuses:
- **Enabled**: Ready to use
- **Building**: Currently being created (can take a few minutes)
- **Error**: Failed to create (check error message)

## Performance Tips

1. **Create indexes before deploying** - Avoid user-facing errors
2. **Use specific indexes** - Only index fields you actually query
3. **Order matters** - Put equality filters first, then range, then orderBy
4. **Monitor usage** - Check Firebase Console for index usage statistics

## Adding New Indexes

When you add new queries that need indexes:

1. Add the index to `firebase/firestore.indexes.json`
2. Deploy: `firebase deploy --only firestore:indexes`
3. Wait for index to build (usually 1-5 minutes)
4. Test your query

## Example: Adding a New Index

If you add a query like:
```typescript
query(
  appointmentsRef,
  where('doctorId', '==', doctorId),
  where('status', '==', 'UPCOMING'),
  orderBy('scheduledAt', 'asc')
)
```

Add to `firestore.indexes.json`:
```json
{
  "collectionGroup": "appointments",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "doctorId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "scheduledAt", "order": "ASCENDING" }
  ]
}
```

Then deploy: `firebase deploy --only firestore:indexes`

## Troubleshooting

**Error: "Index not found"**
- Wait a few minutes for index to build
- Check Firebase Console → Indexes tab for status
- Verify index definition is correct

**Error: "Too many indexes"**
- Firestore free tier: 200 indexes per database
- Consider combining queries or using fewer filters
- Upgrade to Blaze plan for more indexes

**Query still slow after index**
- Check if index is actually being used (Firebase Console)
- Verify query matches index field order
- Consider pagination for large result sets
