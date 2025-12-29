import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Loader2, 
  Mic,
  MicOff,
  Globe,
  X,
  History,
  Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from './NotificationSystem';
import { EmptyState } from './EmptyState';
import { handleError } from '../utils/errorHandler';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export const ConversationalSymptomChecker: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'sw'>('en');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = language === 'sw' ? 'sw-TZ' : 'en-US';

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        notify('Speech recognition failed. Please try typing instead.', 'warning');
      };

      setRecognition(recognitionInstance);
    }

    // Initialize with welcome message
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: language === 'sw' 
          ? 'Habari! Nisaidie kueleza dalili zako za kiafya. Unaweza kuongea au kuandika.'
          : 'Hello! I\'m here to help you assess your symptoms. You can speak or type to describe how you\'re feeling.',
        timestamp: new Date(),
        suggestions: language === 'sw' 
          ? ['Kichwa kinaniuma', 'Kuumwa tumbo', 'Homa', 'Kukohoa']
          : ['Headache', 'Stomach pain', 'Fever', 'Cough'],
      };
      setMessages([welcomeMessage]);
    }
  }, [language]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleVoiceInput = () => {
    if (!recognition) {
      notify('Voice input not supported in this browser', 'warning');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognition.start();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Simulate AI response (replace with actual AI service call)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate context-aware response
      const response = generateAIResponse(input, messages);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        suggestions: response.suggestions,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const generateAIResponse = (userInput: string, conversationHistory: Message[]): { content: string; suggestions?: string[] } => {
    const input = userInput.toLowerCase();
    
    // Simple rule-based responses (in production, this would call an AI service)
    if (input.includes('headache') || input.includes('kichwa')) {
      return {
        content: language === 'sw'
          ? 'Sijisikia vizuri kuhusu kichwa chako. Kuna maswali machache ninayoweza kuuliza: Kichwa kinaniuma lini kilianza? Kuna maumivu makali? Una dalili nyingine pamoja na hili?'
          : 'I understand you\'re experiencing a headache. Let me ask a few questions: When did it start? How severe is the pain? Are there any other symptoms accompanying it?',
        suggestions: language === 'sw'
          ? ['Kilianza leo', 'Siku mbili zilizopita', 'Ni maumivu makali', 'Una homa pia']
          : ['Started today', 'Two days ago', 'Severe pain', 'Also have fever'],
      };
    }

    if (input.includes('fever') || input.includes('homa')) {
      return {
        content: language === 'sw'
          ? 'Homa ni dalili ya kawaida. Je, unaweza kuniambia joto la mwili wako? Ulipima joto? Una dalili nyingine pamoja na homa?'
          : 'Fever is a common symptom. Can you tell me your body temperature? Have you measured it? Are there other symptoms along with the fever?',
        suggestions: language === 'sw'
          ? ['38°C', '39°C', 'Ninakohoa pia', 'Ninakichwa']
          : ['38°C', '39°C', 'Also coughing', 'Have headache'],
      };
    }

    if (input.includes('stomach') || input.includes('tumbo')) {
      return {
        content: language === 'sw'
          ? 'Kuumwa tumbo kunaweza kuwa na sababu nyingi. Unaweza kueleza zaidi: Ni maumivu gani? Yako wapi hasa? Unaweza kula kitu chochote?'
          : 'Stomach pain can have various causes. Can you tell me more: What kind of pain is it? Where exactly? Can you eat anything?',
        suggestions: language === 'sw'
          ? ['Maumivu makali', 'Upande wa kulia', 'Siwezi kula', 'Ninajisikia kichefuchefu']
          : ['Sharp pain', 'Right side', 'Cannot eat', 'Feel nauseous'],
      };
    }

    // Default response
    return {
      content: language === 'sw'
        ? 'Asante kwa maelezo yako. Ili niweze kukusaidia vyema, unaweza kueleza zaidi kuhusu dalili zako? Ni lini zilianza? Jinsi gani unajisikia?'
        : 'Thank you for sharing. To help you better, could you tell me more about your symptoms? When did they start? How are you feeling?',
      suggestions: language === 'sw'
        ? ['Zilianza jana', 'Zilianza wiki moja iliyopita', 'Najisikia vibaya sana', 'Ni dalili za kawaida']
        : ['Started yesterday', 'Started a week ago', 'Feel very unwell', 'Mild symptoms'],
    };
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleClearChat = () => {
    if (confirm(language === 'sw' ? 'Je, una uhakika unataka kufuta mazungumzo yote?' : 'Are you sure you want to clear the conversation?')) {
      setMessages([]);
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Bot className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Symptom Checker</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Conversational health assessment</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLanguage(language === 'en' ? 'sw' : 'en')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
            title="Toggle language"
          >
            <Globe size={18} className="text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{language.toUpperCase()}</span>
          </button>
          <button
            onClick={handleClearChat}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Clear chat"
          >
            <Trash2 size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Bot className="text-blue-600 dark:text-blue-400" size={18} />
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl p-4 ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
            }`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <UserIcon className="text-gray-600 dark:text-gray-400" size={18} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Bot className="text-blue-600 dark:text-blue-400" size={18} />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
              <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={20} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end gap-3">
          <button
            onClick={handleVoiceInput}
            className={`p-3 rounded-xl transition-colors flex-shrink-0 ${
              isRecording
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={language === 'sw' ? 'Andika au ongea dalili zako...' : 'Type or speak your symptoms...'}
              className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white resize-none"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          {language === 'sw'
            ? 'Hii si kiwango cha maoni ya daktari. Tafadhali wasiliana na mtaalamu wa afya kwa matatizo makubwa.'
            : 'This is not a substitute for professional medical advice. Please consult a healthcare provider for serious concerns.'}
        </p>
      </div>
    </div>
  );
};

