
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Loader2, Info, Globe, ShieldCheck, ArrowRight, Activity, AlertTriangle, Stethoscope, HeartPulse, CheckCircle, History, Save } from 'lucide-react';
import { assessSymptoms, SymptomAssessment } from '../services/geminiService';
import { ChatMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { addDoc, collection, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';
import { useNotification } from './NotificationSystem';

interface ExtendedMessage extends ChatMessage {
  assessment?: SymptomAssessment;
}

interface SavedSession {
  id: string;
  userId: string;
  messages: ExtendedMessage[];
  finalAssessment?: SymptomAssessment;
  createdAt: Date;
  summary: string;
}

export const SymptomChecker: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [language, setLanguage] = useState<'en' | 'sw'>('en');
  const [hasStarted, setHasStarted] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pastSessions, setPastSessions] = useState<SavedSession[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ExtendedMessage[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load past symptom check sessions
  useEffect(() => {
    if (user && showHistory) {
      loadPastSessions();
    }
  }, [user, showHistory]);

  const loadPastSessions = async () => {
    if (!user) return;
    
    try {
      const sessionsRef = collection(firestore, 'symptomSessions');
      const q = query(
        sessionsRef,
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as SavedSession[];
      
      setPastSessions(sessions);
    } catch (error) {
      console.error('Failed to load past sessions:', error);
    }
  };

  const saveSession = async () => {
    if (!user || messages.length === 0) {
      notify('Please complete a symptom check first', 'warning');
      return;
    }

    try {
      setLoading(true);
      const lastAiMessage = messages.filter(m => m.role === 'model').pop();
      const userSymptoms = messages.filter(m => m.role === 'user').map(m => m.text).join('; ');
      
      // Convert Date objects to Firestore-compatible format
      const messagesData = messages.map(m => ({
        role: m.role,
        text: m.text,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
        assessment: m.assessment ? {
          reply: m.assessment.reply,
          careLevel: m.assessment.careLevel,
          title: m.assessment.title,
          action: m.assessment.action
        } : null
      }));

      // Save symptom session
      await addDoc(collection(firestore, 'symptomSessions'), {
        userId: user.id,
        userName: user.name,
        messages: messagesData,
        finalAssessment: lastAiMessage?.assessment ? {
          reply: lastAiMessage.assessment.reply,
          careLevel: lastAiMessage.assessment.careLevel,
          title: lastAiMessage.assessment.title,
          action: lastAiMessage.assessment.action
        } : null,
        summary: userSymptoms.substring(0, 200),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Also add to health records for long-term tracking
      if (lastAiMessage?.assessment) {
        await addDoc(collection(firestore, 'healthRecords'), {
          userId: user.id,
          patientId: user.id, // Add patientId for compatibility
          type: 'SYMPTOM_CHECK',
          title: `AI Symptom Assessment - ${lastAiMessage.assessment.careLevel || 'General'}`,
          description: userSymptoms,
          assessment: {
            reply: lastAiMessage.assessment.reply,
            careLevel: lastAiMessage.assessment.careLevel,
            title: lastAiMessage.assessment.title,
            action: lastAiMessage.assessment.action
          },
          recordedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          status: 'Active'
        });
      }

      notify('Symptom check saved to your health history!', 'success');
    } catch (error: any) {
      console.error('Failed to save session:', error);
      console.error('Error details:', {
        code: error?.code,
        message: error?.message,
        userId: user?.id
      });
      notify(`Failed to save session: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    setHasStarted(true);
    // Initial greeting from AI
    const greeting: ExtendedMessage = {
      id: 'init',
      role: 'model',
      text: language === 'sw' 
        ? "Jambo. Mimi ni Nexa. Niko hapa kukusaidia kuelewa dalili zako. Tafadhali niambie unajisikiaje leo?" 
        : "Hi, I'm Nexa. I'm here to help you understand your symptoms. Please tell me, how are you feeling today?",
      timestamp: new Date(),
      assessment: {
        reply: "",
        careLevel: 'Info',
        title: 'Welcome',
        action: ''
      }
    };
    setMessages([greeting]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ExtendedMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);
    
    // Convert to history format for service
    const historyForService = newHistory.map(m => ({ role: m.role, text: m.text }));
    const assessment = await assessSymptoms(historyForService, language);

    const aiMsg: ExtendedMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: assessment.reply,
      timestamp: new Date(),
      assessment: assessment
    };

    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
  };

  const renderTriageCard = (assessment: SymptomAssessment) => {
    if (assessment.careLevel === 'Info') return null;

    let colorClass = "bg-blue-50 border-blue-100 text-blue-800";
    let Icon = Info;
    
    if (assessment.careLevel === 'Emergency') {
        colorClass = "bg-red-50 border-red-100 text-red-900";
        Icon = AlertTriangle;
    } else if (assessment.careLevel === 'Doctor') {
        colorClass = "bg-purple-50 border-purple-100 text-purple-900";
        Icon = Stethoscope;
    } else if (assessment.careLevel === 'SelfCare') {
        colorClass = "bg-emerald-50 border-emerald-100 text-emerald-900";
        Icon = HeartPulse;
    }

    return (
        <div className={`mt-4 p-5 rounded-2xl border ${colorClass} animate-in fade-in slide-in-from-bottom-2`}>
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full bg-white/50 backdrop-blur-sm`}>
                    <Icon size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider mb-1 opacity-80">{assessment.careLevel === 'Emergency' ? 'Urgent Attention' : 'Recommendation'}</h4>
                    <h3 className="font-display text-xl font-bold mb-2">{assessment.title}</h3>
                    <p className="text-sm opacity-90 mb-4">{assessment.action}</p>
                    {assessment.careLevel !== 'SelfCare' && (
                        <button className="bg-white/90 hover:bg-white text-inherit font-bold py-2 px-4 rounded-xl text-sm shadow-sm transition-colors flex items-center gap-2">
                            {assessment.careLevel === 'Emergency' ? 'Call Emergency' : 'Find a Doctor'} <ArrowRight size={14}/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
  };

  // --- LANDING VIEW ---
  if (!hasStarted) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 text-center animate-in fade-in duration-700">
         <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-600/20 mb-8">
            <Activity size={48} className="text-white" />
         </div>
         
         <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
            Hi, I'm Nexa.
         </h1>
         <p className="text-xl text-gray-500 dark:text-gray-400 max-w-md mb-10 leading-relaxed">
            I'm here to help you understand your symptoms and guide you to the right care.
         </p>

         <button 
            onClick={handleStart}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold text-lg shadow-lg hover:transform hover:scale-105 transition-all duration-300"
         >
            Start Checkup
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
         </button>

         <div className="mt-12 flex items-center gap-6 text-sm text-gray-400">
             <div className="flex items-center gap-2">
                 <ShieldCheck size={16} /> Private & Secure
             </div>
             <div className="flex items-center gap-2">
                 <Bot size={16} /> AI Powered
             </div>
         </div>
      </div>
    );
  }

  // --- CHAT VIEW ---
  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden relative">
      
      {/* Minimal Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-md flex justify-between items-center border-b border-gray-50 dark:border-gray-700/50">
         <div className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             Nexa Symptom Checker
         </div>
         <div className="flex items-center gap-2">
             {user && messages.length > 2 && (
               <button 
                   onClick={saveSession}
                   className="text-xs font-bold px-3 py-1.5 bg-nexafya-blue text-white rounded-full hover:bg-blue-700 transition-colors flex items-center gap-1"
               >
                   <Save size={12} /> Save
               </button>
             )}
             <button 
                 onClick={() => setShowHistory(!showHistory)}
                 className="text-xs font-bold px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
             >
                 <History size={12} /> History
             </button>
         <button 
             onClick={() => setLanguage(l => l === 'en' ? 'sw' : 'en')}
             className="text-xs font-bold px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
         >
                 {language === 'en' ? 'SW' : 'EN'}
         </button>
         </div>
      </div>

      {/* History Sidebar */}
      {showHistory && (
        <div className="absolute right-0 top-16 bottom-0 w-80 bg-white dark:bg-[#0F172A] border-l border-gray-200 dark:border-gray-700/50 p-4 overflow-y-auto z-20 animate-in slide-in-from-right">
          <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Past Assessments</h3>
          {pastSessions.length === 0 ? (
            <p className="text-gray-400 text-sm">No past sessions found</p>
          ) : (
            <div className="space-y-3">
              {pastSessions.map(session => (
                <div key={session.id} className="bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent dark:border-gray-700/50" onClick={() => {
                  setMessages(session.messages);
                  setShowHistory(false);
                }}>
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      session.finalAssessment?.careLevel === 'Emergency' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      session.finalAssessment?.careLevel === 'Doctor' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                      session.finalAssessment?.careLevel === 'SelfCare' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {session.finalAssessment?.careLevel || 'Info'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {session.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {session.summary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pt-20 space-y-8 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-4 duration-500`}>
            
            {/* Avatar for AI */}
            {msg.role === 'model' && (
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                        <Bot size={12} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-gray-400">Nexa</span>
                </div>
            )}

            {/* Message Bubble */}
            <div className={`max-w-[85%] md:max-w-[70%] text-base md:text-lg leading-relaxed px-6 py-4 rounded-3xl ${
              msg.role === 'user' 
                ? 'bg-gray-900 text-white rounded-br-sm' 
                : 'bg-gray-50 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-bl-sm'
            }`}>
              {msg.text}
            </div>

            {/* Triage Card (Only for AI) */}
            {msg.role === 'model' && msg.assessment && renderTriageCard(msg.assessment)}
            
            {/* Timestamp */}
            <span className="text-[10px] text-gray-300 mt-2 px-2">
                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-4">
             <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center mt-1">
                <Bot size={12} className="text-white" />
             </div>
             <div className="bg-gray-50 dark:bg-gray-600 p-4 rounded-3xl rounded-bl-sm flex gap-2 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white dark:bg-[#0F172A] border-t border-gray-100 dark:border-gray-700/50">
        <div className="relative max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={language === 'sw' ? "Andika jibu lako..." : "Type your answer..."}
            className="w-full bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white rounded-full py-4 pl-6 pr-14 text-lg border border-transparent focus:border-blue-500 focus:ring-0 transition-all shadow-sm"
            disabled={loading}
            autoFocus
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-md"
          >
            <ArrowRight size={20} />
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
            NexaFya is an AI assistant and does not replace professional medical advice.
        </p>
      </div>
    </div>
  );
};
