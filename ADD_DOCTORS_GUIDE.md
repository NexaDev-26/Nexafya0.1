# How to Add Sample Doctors to NexaFya

## Quick Methods

### Method 1: Using the Admin Panel (Easiest)

1. **Log in as Admin**
   - Make sure you're logged in with an Admin account

2. **Go to Care Center → Specialists**
   - Navigate to the Care Center
   - Click on the "Specialists" tab
   - If no doctors are found, you'll see an "Add Sample Doctors" button

3. **Click "Add Sample Doctors"**
   - The button will add 4 professional doctors with complete profiles
   - You'll see a success message when done

### Method 2: Using Browser Console

1. **Open Browser Console**
   - Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - Go to the "Console" tab

2. **Run the Command**
   ```javascript
   addSampleDoctors()
   ```

3. **Check Results**
   - You'll see messages for each doctor added
   - Refresh the page to see the doctors

### Method 3: Using the Setup Script (Requires serviceAccountKey.json)

If you have the Firebase service account key:

```bash
npm run setup:firebase
```

This will add all sample data including doctors, medicines, and articles.

## Sample Doctors Included

1. **Dr. Sarah Mushi** - Cardiologist
   - Location: Dar es Salaam
   - Experience: 12 years
   - Rating: 4.9
   - Workplace: Muhimbili National Hospital
   - Verified with license number

2. **Dr. John Kiswaga** - Pediatrician
   - Location: Arusha
   - Experience: 10 years
   - Rating: 4.8
   - Workplace: Arusha Regional Hospital
   - Verified with license number

3. **Dr. Grace Ndosi** - General Practitioner
   - Location: Mwanza
   - Experience: 8 years
   - Rating: 4.7
   - Workplace: Bugando Medical Centre
   - Verified with license number

4. **Dr. Zero** - General Practitioner
   - Location: Dar es Salaam
   - Experience: 15 years
   - Rating: 4.9
   - Workplace: Aga Khan Hospital
   - Verified with license number

## Doctor Profile Fields

Each doctor includes:
- ✅ Name, Email, Phone
- ✅ Specialty and Location
- ✅ Rating and Experience
- ✅ Consultation Fee
- ✅ Availability Schedule
- ✅ Professional Bio
- ✅ Workplace/Hospital
- ✅ Medical License Number
- ✅ Council Registration
- ✅ Verification Status
- ✅ Trust Tier
- ✅ Avatar/Profile Picture

## Troubleshooting

**No doctors showing?**
- Check browser console for errors
- Verify Firebase connection
- Make sure you're logged in
- Try refreshing the page

**Can't add doctors?**
- Make sure you're logged in as Admin
- Check Firestore security rules
- Verify Firebase configuration

**Doctors added but not visible?**
- Refresh the page
- Clear browser cache
- Check if doctors are in Firestore console

## Next Steps

After adding doctors:
1. ✅ Doctors will appear in Care Center → Specialists
2. ✅ Patients can view doctor profiles
3. ✅ Patients can book appointments
4. ✅ Doctors can be searched and filtered
5. ✅ All professional details are displayed

---

**Need Help?** Check the browser console for detailed error messages.

