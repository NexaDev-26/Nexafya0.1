import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, StatusBar, SafeAreaView, ActivityIndicator, FlatList, Alert } from 'react-native';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
// Note: For React Native, use @react-native-firebase packages
// This is a placeholder - actual implementation requires Firebase React Native SDK
// import auth from '@react-native-firebase/auth';
// import firestore from '@react-native-firebase/firestore';

// Production API URL
const API_BASE_URL = 'http://192.168.1.100:3001'; // Replace with your real local/remote IP

export default function App() {
  const [currentTab, setCurrentTab] = useState('Home');
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Session Check - Firebase Auth
    // Note: This requires @react-native-firebase/auth
    // const unsubscribe = auth().onAuthStateChanged((firebaseUser) => {
    //   if (firebaseUser) {
    //     setSession({ user: firebaseUser });
    //     fetchUserData(firebaseUser.uid);
    //   } else {
    //     setSession(null);
    //     setLoading(false);
    //   }
    // });
    // return unsubscribe;
    
    // Placeholder: Check if user is logged in via web platform
    // In production, sync with Firebase Auth
    setLoading(false);
  }, []);

  const fetchUserData = async (userId) => {
      try {
          setLoading(true);
          // Note: This requires @react-native-firebase/firestore
          // const userDoc = await firestore().collection('users').doc(userId).get();
          // const appointmentsSnapshot = await firestore()
          //   .collection('appointments')
          //   .where('patientId', '==', userId)
          //   .orderBy('date', 'desc')
          //   .get();
          
          // if (userDoc.exists) setUser(userDoc.data());
          // if (!appointmentsSnapshot.empty) {
          //   setAppointments(appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          // }

          // Real-time Order Subscription - Firebase Firestore
          // const unsubscribe = firestore()
          //   .collection('orders')
          //   .where('patientId', '==', userId)
          //   .onSnapshot((snapshot) => {
          //     snapshot.docChanges().forEach((change) => {
          //       if (change.type === 'modified') {
          //         Alert.alert("Order Update", `Your order status is now: ${change.doc.data().status}`);
          //       }
          //     });
          //   });
          
          // return unsubscribe;
      } catch (err) {
          console.error("Data Fetch Error", err);
      } finally {
          setLoading(false);
      }
  };

  const handleCallAPI = async (endpoint, method = 'GET', body = null) => {
      if (!session) return;
      try {
          // Get Firebase Auth token for API calls
          // const token = await auth().currentUser?.getIdToken();
          const res = await fetch(`${API_BASE_URL}${endpoint}`, {
              method,
              headers: {
                  'Content-Type': 'application/json',
                  // 'Authorization': `Bearer ${token}`
              },
              body: body ? JSON.stringify(body) : null
          });
          return await res.json();
      } catch (e) {
          Alert.alert("Connection Error", "Could not connect to NexaFya backend.");
      }
  };

  if (loading) {
      return (
          <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066CC" />
              <Text style={styles.loadingText}>Syncing Health Data...</Text>
          </View>
      );
  }

  // --- UI Renders ---
  const renderHome = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.ussdCard}>
        <View>
          <Text style={styles.ussdTitle}>No Internet?</Text>
          <Text style={styles.ussdText}>Dial *150*60# to access NexaFya services via USSD.</Text>
        </View>
        <MaterialIcons name="phonelink-ring" size={32} color="#FFF" />
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.grid}>
        {[
            { label: 'Doctor', icon: 'user-md', color: '#E0F2FE', text: '#0284C7' },
            { label: 'Pharmacy', icon: 'capsules', color: '#DCFCE7', text: '#16A34A' },
            { label: 'AI Scan', icon: 'robot', color: '#F3E8FF', text: '#9333EA' },
            { label: 'SOS', icon: 'ambulance', color: '#FFEDD5', text: '#EA580C' }
        ].map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.card}>
                <View style={[styles.iconBox, { backgroundColor: item.color }]}>
                    <FontAwesome5 name={item.icon} size={24} color={item.text} />
                </View>
                <Text style={styles.cardText}>{item.label}</Text>
            </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Next Appointment</Text>
      {appointments.length > 0 ? (
          <View style={styles.appointmentCard}>
            <View style={styles.aptHeader}>
              <View style={styles.docAvatar}><Ionicons name="person" size={24} color="#CBD5E1"/></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.docName}>{appointments[0].doctor?.name}</Text>
                <Text style={styles.docSpec}>{appointments[0].consultation_type} Consultation</Text>
              </View>
              <TouchableOpacity style={styles.videoIcon} onPress={() => Alert.alert("Video", "Launching Nexa-Meet...")}>
                <Ionicons name="videocam" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
      ) : (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>No appointments scheduled.</Text></View>
      )}
    </ScrollView>
  );

  if (!session) {
      return (
          <SafeAreaView style={styles.authContainer}>
              {/* Fix: replaced undefined Activity with Ionicons component for display */}
              <Ionicons name="activity" size={64} color="#0066CC" />
              <Text style={styles.authTitle}>NexaFya Mobile</Text>
              <Text style={styles.authDesc}>Please log in on the web platform to sync your mobile session.</Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={() => setLoading(true)}>
                  <Text style={styles.refreshBtnText}>Check Session</Text>
              </TouchableOpacity>
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image source={{ uri: user?.avatar || 'https://ui-avatars.com/api/?name=User' }} style={styles.avatar} />
          <View>
            <Text style={styles.greeting}>Jambo,</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0]}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notifButton}><Ionicons name="notifications" size={24} color="#333" /></TouchableOpacity>
      </View>

      {currentTab === 'Home' ? renderHome() : <View style={styles.center}><Text>Module: {currentTab}</Text></View>}

      <View style={styles.bottomNav}>
         {['Home', 'Visits', 'Chat', 'Profile'].map(t => (
             <TouchableOpacity key={t} style={styles.navItem} onPress={() => setCurrentTab(t)}>
                <Ionicons name={t === 'Home' ? 'home' : t === 'Visits' ? 'calendar' : t === 'Chat' ? 'chatbubbles' : 'person'} size={24} color={currentTab === t ? "#0066CC" : "#94A3B8"} />
                <Text style={[styles.navText, { color: currentTab === t ? '#0066CC' : '#94A3B8' }]}>{t}</Text>
             </TouchableOpacity>
         ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  loadingText: { marginTop: 12, color: '#64748B', fontWeight: 'bold' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 12 },
  greeting: { fontSize: 14, color: '#64748B' },
  userName: { fontSize: 18, fontWeight: 'bold' },
  notifButton: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 12 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  ussdCard: { backgroundColor: '#0066CC', borderRadius: 24, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  ussdTitle: { color: '#93C5FD', fontWeight: 'bold' },
  ussdText: { color: '#FFF', fontSize: 12, opacity: 0.8, maxWidth: 200 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#FFF', padding: 16, borderRadius: 20, alignItems: 'center', marginBottom: 16, elevation: 2 },
  iconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardText: { fontWeight: '600', color: '#334155' },
  appointmentCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, elevation: 2 },
  aptHeader: { flexDirection: 'row', alignItems: 'center' },
  docAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  docName: { fontWeight: 'bold', fontSize: 16 },
  docSpec: { color: '#64748B', fontSize: 13 },
  videoIcon: { backgroundColor: '#0066CC', padding: 10, borderRadius: 12 },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', position: 'absolute', bottom: 0, left: 0, right: 0 },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 10, marginTop: 4 },
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  authTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 24 },
  authDesc: { textAlign: 'center', color: '#64748B', marginTop: 12, lineHeight: 20 },
  refreshBtn: { marginTop: 32, backgroundColor: '#0066CC', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
  refreshBtnText: { color: '#FFF', fontWeight: 'bold' }
});