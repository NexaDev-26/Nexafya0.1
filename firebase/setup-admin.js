// Automated Firebase Setup with better error handling
const admin = require('firebase-admin');

console.log('🔥 Firebase Automated Setup Starting...\n');

let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch (error) {
  console.error('❌ ERROR: Service account key not found!');
  console.error('\nThe file should be at:', require('path').resolve(__dirname, '../serviceAccountKey.json'));
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
  storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
});

// Use the specific database name: nexafyadb
const db = admin.firestore();
const settings = { databaseId: 'nexafyadb' };
db.settings(settings);

// Sample data
const sampleDoctors = [
  {
    name: "Dr. Sarah Mushi",
    email: "sarah.mushi@nexafya.com",
    specialty: "Cardiologist",
    rating: 4.9,
    ratingCount: 127,
    consultationFee: 50000,
    experienceYears: 12,
    avatar: "https://ui-avatars.com/api/?name=Sarah+Mushi&background=10b981&color=fff",
    location: "Dar es Salaam",
    availability: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    subscriptionTier: "Premium",
    points: 2500,
    bio: "Experienced cardiologist with over 12 years of practice specializing in heart disease prevention and treatment. Committed to providing comprehensive cardiac care with a focus on patient education and preventive medicine."
  },
  {
    name: "Dr. John Kiswaga",
    email: "john.kiswaga@nexafya.com",
    specialty: "Pediatrician",
    rating: 4.8,
    ratingCount: 89,
    consultationFee: 45000,
    experienceYears: 10,
    avatar: "https://ui-avatars.com/api/?name=John+Kiswaga&background=3b82f6&color=fff",
    location: "Arusha",
    availability: ["Monday", "Wednesday", "Friday", "Saturday"],
    subscriptionTier: "Standard",
    points: 1800,
    bio: "Dedicated pediatrician with 10 years of experience caring for children from infancy through adolescence. Specializes in childhood development, vaccinations, and common pediatric conditions."
  },
  {
    name: "Dr. Grace Ndosi",
    email: "grace.ndosi@nexafya.com",
    specialty: "General Practitioner",
    rating: 4.7,
    ratingCount: 156,
    consultationFee: 35000,
    experienceYears: 8,
    avatar: "https://ui-avatars.com/api/?name=Grace+Ndosi&background=f59e0b&color=fff",
    location: "Mwanza",
    availability: ["Monday", "Tuesday", "Thursday", "Saturday", "Sunday"],
    subscriptionTier: "Basic",
    points: 1200,
    bio: "Compassionate general practitioner with 8 years of experience providing primary healthcare services. Focuses on preventive care, health education, and managing common medical conditions for patients of all ages."
  },
  {
    name: "Dr. Zero",
    email: "doctor.zero@nexafya.com",
    specialty: "General Practitioner",
    rating: 4.9,
    ratingCount: 203,
    consultationFee: 40000,
    experienceYears: 15,
    avatar: "https://ui-avatars.com/api/?name=Doctor+Zero&background=06b6d4&color=fff",
    location: "Dar es Salaam, Tanzania",
    availability: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    subscriptionTier: "Premium",
    points: 3500,
    bio: "Renowned general practitioner with 15 years of comprehensive medical experience. Known for excellent patient care, thorough diagnosis, and commitment to improving community health outcomes in Tanzania."
  }
];

const sampleMedicines = [
  {
    name: "Paracetamol 500mg",
    genericName: "Acetaminophen",
    category: "Pain Relief",
    price: 2000,
    manufacturer: "Shelys Pharmaceuticals",
    requiresPrescription: false,
    inStock: true
  },
  {
    name: "Amoxicillin 500mg",
    genericName: "Amoxicillin",
    category: "Antibiotic",
    price: 8000,
    manufacturer: "Zenufa Laboratories",
    requiresPrescription: true,
    inStock: true
  },
  {
    name: "Vitamin C 1000mg",
    genericName: "Ascorbic Acid",
    category: "Supplement",
    price: 5000,
    manufacturer: "Keko Pharma",
    requiresPrescription: false,
    inStock: true
  }
];

const sampleArticles = [
  {
    title: "Understanding Malaria: Prevention and Treatment in Tanzania",
    excerpt: "A comprehensive guide to malaria prevention, symptoms, and treatment options available in Tanzania.",
    content: "Malaria remains one of the leading health challenges in Tanzania. This comprehensive guide covers prevention methods including mosquito nets, antimalarial medications, and environmental controls. Early symptoms include fever, chills, and headaches. Treatment options vary from artemisinin-based combination therapies to supportive care. Community health workers play a vital role in malaria prevention and early detection.",
    category: "Infectious Diseases",
    authorName: "Dr. Sarah Mushi",
    authorRole: "DOCTOR",
    readTime: 8,
    likes: 245,
    views: 1832,
    image: "https://picsum.photos/800/400?random=1",
    isPremium: false,
    status: "published",
    highlights: ["Prevention methods", "Early detection", "Treatment options"]
  },
  {
    title: "Managing Diabetes: A Tanzanian Perspective",
    excerpt: "Learn about diabetes management, diet tips, and lifestyle changes for better health outcomes.",
    content: "Diabetes is a growing concern in Tanzania. This guide provides practical tips for managing diabetes through diet, exercise, and medication. Learn about blood sugar monitoring, healthy eating with local foods, exercise routines suitable for Tanzanian climate, and medication adherence. Regular check-ups and community support are essential for successful diabetes management.",
    category: "Chronic Diseases",
    authorName: "Dr. John Kiswaga",
    authorRole: "DOCTOR",
    readTime: 10,
    likes: 189,
    views: 1456,
    image: "https://picsum.photos/800/400?random=2",
    isPremium: false,
    status: "published",
    highlights: ["Diet management", "Exercise tips", "Blood sugar monitoring"]
  }
];

const subscriptionPackages = [
  { 
    id: "basic", 
    name: "Basic", 
    price: 0, 
    interval: "month", 
    features: [
      "Free symptom checker",
      "Health articles access",
      "Basic consultation (pay per visit)",
      "Medicine delivery",
      "USSD access"
    ], 
    popular: false 
  },
  { 
    id: "standard", 
    name: "Standard", 
    price: 25000, 
    interval: "month", 
    features: [
      "Everything in Basic",
      "2 free consultations/month",
      "Priority doctor response",
      "Health records storage",
      "Family profiles (up to 4)",
      "10% medicine discount"
    ], 
    popular: true 
  },
  { 
    id: "premium", 
    name: "Premium", 
    price: 50000, 
    interval: "month", 
    features: [
      "Everything in Standard",
      "Unlimited consultations",
      "24/7 priority support",
      "Home visit option",
      "Advanced health analytics",
      "20% medicine discount",
      "Premium article access"
    ], 
    popular: false 
  }
];

const partners = [
  { 
    name: "Muhimbili National Hospital", 
    logo: "https://ui-avatars.com/api/?name=MNH&background=10b981&color=fff&size=200", 
    type: "Hospital", 
    location: "Dar es Salaam" 
  },
  { 
    name: "Keko Pharma", 
    logo: "https://ui-avatars.com/api/?name=KP&background=3b82f6&color=fff&size=200", 
    type: "Pharmacy", 
    location: "Nationwide" 
  },
  { 
    name: "Tanzania Medical Council", 
    logo: "https://ui-avatars.com/api/?name=TMC&background=f59e0b&color=fff&size=200", 
    type: "Regulatory", 
    location: "Tanzania" 
  }
];

async function setupData() {
  try {
    // Test database connection
    console.log('🔍 Checking Firestore connection...');
    await db.collection('_test').doc('_test').set({ test: true });
    await db.collection('_test').doc('_test').delete();
    console.log('✅ Firestore connection successful!\n');

    console.log('📝 Adding doctors...');
    for (const doctor of sampleDoctors) {
      await db.collection('doctors').add({
        ...doctor,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Added: ${doctor.name}`);
    }

    console.log('\n💊 Adding medicines...');
    for (const medicine of sampleMedicines) {
      await db.collection('medicines').add({
        ...medicine,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Added: ${medicine.name}`);
    }

    console.log('\n📰 Adding articles...');
    for (const article of sampleArticles) {
      await db.collection('articles').add({
        ...article,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Added: ${article.title.substring(0, 40)}...`);
    }

    console.log('\n💳 Adding subscription packages...');
    for (const pkg of subscriptionPackages) {
      await db.collection('subscriptionPackages').doc(pkg.id).set({
        ...pkg,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Added: ${pkg.name}`);
    }

    console.log('\n🤝 Adding partners...');
    for (const partner of partners) {
      await db.collection('partners').add({
        ...partner,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Added: ${partner.name}`);
    }

    console.log('\n✨ Setup completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - ${sampleDoctors.length} doctors`);
    console.log(`   - ${sampleMedicines.length} medicines`);
    console.log(`   - ${sampleArticles.length} articles`);
    console.log(`   - ${subscriptionPackages.length} packages`);
    console.log(`   - ${partners.length} partners`);
    console.log('\n🎉 Your NexaFya database is ready!');
    console.log('\n📱 Next steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Open: http://localhost:5173');
    console.log('   3. Sign up and start using NexaFya!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 5 || error.message.includes('NOT_FOUND')) {
      console.error('\n⚠️  Firestore database not found!');
      console.error('\nPlease create the Firestore database:');
      console.error('1. Go to: https://console.firebase.google.com/project/nexafya/firestore');
      console.error('2. Click "Create database"');
      console.error('3. Select "Start in test mode"');
      console.error('4. Choose a location (eur3 recommended)');
      console.error('5. Click "Enable"');
      console.error('6. Run this script again: node firebase/setup-admin.js\n');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.error('\n⚠️  Permission denied!');
      console.error('\nPlease make sure:');
      console.error('1. Firestore security rules are in "test mode"');
      console.error('2. Service account key has correct permissions\n');
    } else {
      console.error('\nFull error:', error);
    }
    
    process.exit(1);
  }
}

setupData();
