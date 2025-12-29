
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Search, Send, Paperclip, MoreVertical, Phone, Video, Check, CheckCheck, Mic, Smile, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { User, UserRole, Appointment } from '../types';
import { db } from '../services/db';
import { useNotification } from './NotificationSystem';

interface MessagesProps {
  user: User;
  onNavigate?: (view: string) => void;
}

export const Messages: React.FC<MessagesProps> = ({ user, onNavigate }) => {
  const { notify } = useNotification();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Build chat partners from appointments (doctor <-> patient)
  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const apts = await db.getAppointments(user.id, user.role as UserRole);
        setAppointments(apts || []);
        if (!selectedPartnerId && apts?.length) {
          const first = apts[0];
          const partnerId = user.role === UserRole.DOCTOR ? first.patientId : first.doctorId;
          if (partnerId) setSelectedPartnerId(partnerId);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.role]);

  const partners = useMemo(() => {
    const map = new Map<string, any>();
    for (const apt of appointments) {
      const partnerId = user.role === UserRole.DOCTOR ? apt.patientId : apt.doctorId;
      if (!partnerId) continue;
      if (map.has(partnerId)) continue;
      const partnerName = user.role === UserRole.DOCTOR ? apt.patientName : apt.doctorName;
      map.set(partnerId, {
        id: partnerId,
        name: partnerName,
        subtitle: user.role === UserRole.DOCTOR ? 'Patient' : 'Doctor',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}&background=random`
      });
    }
    return Array.from(map.values());
  }, [appointments, user.role]);

  const selectedPartner = partners.find(p => p.id === selectedPartnerId) || partners[0] || null;

  // Load Messages
  useEffect(() => {
    const loadMsgs = async () => {
      if (!selectedPartner) return;
      const history = await db.getMessages(user.id, selectedPartner.id);
      setMessages(history.length > 0 ? history : []);
    };
    loadMsgs();
  }, [selectedPartnerId, user.id]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
      if (!inputText.trim()) return;
      if (!selectedPartner) return;
      
      const tempId = Date.now().toString();
      const newMsg = {
          id: tempId,
          sender: 'me',
          text: inputText,
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          status: 'sent'
      };

      setMessages(prev => [...prev, newMsg]);
      setInputText('');

      await db.sendMessage(user.id, selectedPartner.id, newMsg.text);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6 animate-in fade-in duration-500">
        
        {/* Sidebar */}
        <div className={`w-full md:w-96 bg-white dark:bg-[#0F172A] rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col overflow-hidden ${showChatOnMobile ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700/50">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white font-serif mb-4">Messages</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Search chats..." className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {partners.map(chat => (
                    <div key={chat.id} onClick={() => { setSelectedPartnerId(chat.id); setShowChatOnMobile(true); }} className={`p-3 rounded-2xl cursor-pointer transition-colors flex items-center gap-4 group ${selectedPartner?.id === chat.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                        <div className="relative">
                            <img src={chat.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm" alt={chat.name} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <h4 className={`font-bold text-sm truncate ${selectedPartner?.id === chat.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>{chat.name}</h4>
                                <span className="text-[10px] text-gray-400 font-medium">{chat.subtitle}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-500 truncate max-w-[180px]">Tap to open conversation</p>
                            </div>
                        </div>
                    </div>
                ))}
                {partners.length === 0 && (
                  <div className="p-6 text-center text-sm text-gray-500">No chats yet. Book a consultation or message from “My Patients”.</div>
                )}
            </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 bg-white dark:bg-[#0F172A] rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700/50 flex-col overflow-hidden relative ${showChatOnMobile ? 'flex' : 'hidden md:flex'}`}>
            <div className="p-4 px-6 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center bg-white/80 dark:bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowChatOnMobile(false)} className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ArrowLeft size={24} /></button>
                    {selectedPartner ? (
                      <>
                        <div className="relative"><img src={selectedPartner.avatar} className="w-12 h-12 rounded-full object-cover" alt={selectedPartner.name} /></div>
                        <div><h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{selectedPartner.name}</h3><span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{selectedPartner.subtitle}</span></div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">Select a chat</div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!selectedPartner) return;
                        notify('Starting voice call…', 'info');
                        onNavigate?.('video-call');
                      }}
                      className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors hidden sm:block"
                      title="Voice call"
                    >
                      <Phone size={20} />
                    </button>
                    <button
                      onClick={() => {
                        if (!selectedPartner) return;
                        notify('Starting video call…', 'info');
                        onNavigate?.('video-call');
                      }}
                      className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                      title="Video call"
                    >
                      <Video size={20} />
                    </button>
                    <button className="p-3 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors" title="Menu"><MoreVertical size={20} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 dark:bg-[#0A1B2E]/50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`max-w-[85%] md:max-w-[70%] relative group ${msg.sender === 'me' ? 'items-end' : 'items-start'} flex flex-col`}>
                            <div className={`px-6 py-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === 'me' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>{msg.text}</div>
                            <div className="flex items-center gap-1 mt-1 px-1"><span className="text-[10px] text-gray-400 font-medium">{msg.time}</span>{msg.sender === 'me' && <span className="text-blue-600 dark:text-blue-400">{msg.status === 'read' ? <CheckCheck size={14} /> : <Check size={14} />}</span>}</div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white dark:bg-[#0F172A] border-t border-gray-100 dark:border-gray-700/50">
                <div className="flex items-end gap-2 bg-gray-50 dark:bg-[#0A1B2E] p-2 rounded-3xl border border-gray-200 dark:border-gray-700/50 transition-colors focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                    <button className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors hidden sm:block"><Smile size={20} /></button>
                    <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type a message..." className="flex-1 bg-transparent border-none outline-none py-3 max-h-32 text-gray-900 dark:text-white placeholder-gray-400" />
                    <div className="flex items-center gap-1 pr-1">
                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors hidden sm:block"><Paperclip size={20} /></button>
                        {!inputText ? (
                            <><button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><ImageIcon size={20} /></button><button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><Mic size={20} /></button></>
                        ) : (
                            <button onClick={handleSendMessage} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md transform hover:scale-105"><Send size={18} /></button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
