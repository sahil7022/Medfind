import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Bot, User, Sparkles, Globe, Volume2, Mic, MicOff,
  AlertTriangle, Search, RefreshCw, Stethoscope, ChevronRight, CheckCircle2
} from 'lucide-react';
import { analyzeSymptomsWithGemini, ChatMessage } from '../services/gemini';

interface SymptomCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchMedicine: (medicineName: string) => void;
}

const LANGUAGES = [
  { code: 'English', label: 'English', flag: '🇬🇧' },
  { code: 'Spanish', label: 'Español', flag: '🇪🇸' },
  { code: 'Hindi', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'French', label: 'Français', flag: '🇫🇷' },
  { code: 'German', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'Chinese', label: '中文', flag: '🇨🇳' },
  { code: 'Arabic', label: 'العربية', flag: '🇸🇦' },
  { code: 'Bengali', label: 'বাংলা', flag: '🇧🇩' },
];

const STARTER_CHIPS = [
  { label: '🤒 Fever & Chills', text: 'I have a high fever, shivering, and body temperature around 101°F.' },
  { label: '🤕 Severe Headache', text: 'I am experiencing a pulsing headache and sensitivity to light.' },
  { label: '🤧 Cough & Sore Throat', text: 'Dry cough with a sore throat, runny nose, and sneezing.' },
  { label: '🤢 Stomach Pain & Gas', text: 'Stomach cramping, acid reflux, and feeling nauseous after eating.' },
  { label: '🥱 Fatigue & Muscle Ache', text: 'Extremely feeling exhausted with muscle pain across my back and legs.' },
];

export const SymptomCheckerModal: React.FC<SymptomCheckerModalProps> = ({
  isOpen, onClose, onSearchMedicine
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [inputSymptoms, setInputSymptoms] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initial welcome message in selected language
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-1',
          sender: 'ai',
          text: getWelcomeText(selectedLanguage),
          timestamp: new Date(),
        }
      ]);
    }
  }, [selectedLanguage]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnalyzing]);

  // Welcome greeting generator for multilingual support
  function getWelcomeText(lang: string): string {
    switch (lang.toLowerCase()) {
      case 'spanish':
        return `¡Hola! Soy tu **Asistente de Salud e Inteligencia Médica MedFind** 🩺\nDescribe tus síntomas y te sugeriré medicamentos de venta libre (OTC), dosis y precauciones.`;
      case 'hindi':
        return `नमस्ते! मैं आपका **MedFind AI स्वास्थ्य सहायक** हूँ 🩺\nअपने लक्षण बताएं, और मैं आपको उचित दवाएं (OTC), खुराक और सावधानियां बताऊंगा।`;
      case 'french':
        return `Bonjour ! Je suis votre **Assistant Médical IA MedFind** 🩺\nDécrivez vos symptômes et je vous suggérerai des médicaments en vente libre adaptés.`;
      case 'german':
        return `Hallo! Ich bin Ihr **MedFind KI-Gesundheitsassistent** 🩺\nBeschreiben Sie Ihre Symptome für Rezeptfreie Medikamenten-Empfehlungen.`;
      case 'chinese':
        return `您好！我是 **MedFind AI 智能健康助手** 🩺\n请描述您的症状，我将为您推荐合适的非处方药物、用量及注意事项。`;
      case 'arabic':
        return `مرحباً! أنا **مساعد MedFind الطبي الذكي** 🩺\nصف أعراضك وسأقترح عليك الأدوية المناسبة والجرعات والتنبيهات.`;
      case 'bengali':
        return `হ্যালো! আমি আপনার **MedFind AI স্বাস্থ্য সহকারী** 🩺\nআপনার লক্ষণগুলি বলুন, আমি আপনাকে প্রয়োজনীয় ওষুধ ও সঠিক ডোজের তথ্য দেব।`;
      default:
        return `Hello! I am your **MedFind AI Health & Symptom Assistant** 🩺\nDescribe your symptoms below, and I will analyze them using Google Gemini API to suggest appropriate over-the-counter (OTC) medicines, dosage instructions, and safety precautions.`;
    }
  }

  // Handle Voice Input (Speech-to-Text)
  const toggleVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech Recognition is not supported in your current browser. Please type your symptoms.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    const langMap: Record<string, string> = {
      English: 'en-US',
      Spanish: 'es-ES',
      Hindi: 'hi-IN',
      French: 'fr-FR',
      German: 'de-DE',
      Chinese: 'zh-CN',
      Arabic: 'ar-SA',
      Bengali: 'bn-IN',
    };
    recognition.lang = langMap[selectedLanguage] || 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputSymptoms((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Text-to-Speech Handler
  const handleSpeakText = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingMessageId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`~]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const langMap: Record<string, string> = {
      English: 'en-US',
      Spanish: 'es-ES',
      Hindi: 'hi-IN',
      French: 'fr-FR',
      German: 'de-DE',
      Chinese: 'zh-CN',
      Arabic: 'ar-SA',
      Bengali: 'bn-IN',
    };
    utterance.lang = langMap[selectedLanguage] || 'en-US';

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Submit Symptoms to Gemini AI
  const handleSendSymptoms = async (customText?: string) => {
    const textToAnalyze = (customText || inputSymptoms).trim();
    if (!textToAnalyze || isAnalyzing) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: textToAnalyze,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputSymptoms('');
    setIsAnalyzing(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome-1')
        .slice(-4)
        .map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          content: m.text,
        }));

      const result = await analyzeSymptomsWithGemini(textToAnalyze, selectedLanguage, history);

      const aiMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: result.reply,
        suggestedMedicines: result.suggestedMedicines,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Error analyzing symptoms:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'ai',
          text: `⚠️ Sorry, I encountered an issue analyzing your request. Please try again.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetChat = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
    window.speechSynthesis?.cancel();
    setSpeakingMessageId(null);
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        sender: 'ai',
        text: getWelcomeText(selectedLanguage),
        timestamp: new Date(),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center md:justify-end p-0 md:p-6 bg-slate-950/75 backdrop-blur-md">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 cursor-pointer"
        />

        {/* Floating Modal Card */}
        <motion.div
          initial={{ x: '100%', opacity: 0, scale: 0.96 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: '100%', opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-2xl h-full md:h-[90vh] md:max-h-[820px] bg-slate-950/90 text-white md:rounded-3xl shadow-2xl shadow-slate-950/90 flex flex-col overflow-hidden border border-slate-800/80 z-10 backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="p-4 md:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-slate-900 border border-emerald-500/30 text-emerald-400 grid place-items-center shadow-lg shadow-emerald-950/40">
                  <Bot size={24} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-50 tracking-tight">
                    MedFind AI Symptom Assistant
                  </h3>
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                    <Sparkles size={11} className="text-amber-300" /> Gemini 2.5
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Multilingual OTC Medicine Recommendation Engine</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleResetChat}
                title="Reset Chat"
                className="w-9 h-9 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 transition-all flex items-center justify-center"
              >
                <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-emerald-400' : ''} />
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 transition-all flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Language Selector Bar (NO HORIZONTAL SCROLLBAR) */}
          <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800/60 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400 shrink-0 text-xs font-semibold">
              <Globe size={14} className="text-emerald-400" />
              <span>Language:</span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
              {LANGUAGES.map((lang) => {
                const isActive = selectedLanguage === lang.code;
                return (
                  <motion.button
                    key={lang.code}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 relative ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50 border border-emerald-400/40'
                        : 'bg-slate-900/80 text-slate-400 hover:bg-slate-850 hover:text-slate-200 border border-slate-800/60'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Messages Area (Sleek custom scrollbar) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 chat-scrollbar bg-slate-950/50">
            {/* Sticky Safety Notice Banner */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-amber-950/25 border border-amber-500/30 text-amber-200/90 text-xs flex items-start gap-3 shadow-md backdrop-blur-sm"
            >
              <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <b className="font-bold text-amber-300 block mb-0.5 text-xs uppercase tracking-wider">Medical Safety Notice:</b>
                AI suggestions are for general educational purposes only. If experiencing severe chest pain, breathing difficulty, or high fever, seek emergency medical care immediately.
              </div>
            </motion.div>

            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 grid place-items-center text-emerald-400 shrink-0 mt-1 shadow-md">
                    <Stethoscope size={16} />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed relative group shadow-lg ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#173d57] to-[#1e4d6e] text-white rounded-tr-sm border border-slate-700/60 shadow-slate-950/40'
                      : 'bg-slate-900/90 backdrop-blur-md border border-slate-800/80 text-slate-200 rounded-tl-sm shadow-slate-950/60'
                  }`}
                >
                  {/* TTS Button for AI messages */}
                  {msg.sender === 'ai' && (
                    <button
                      onClick={() => handleSpeakText(msg.id, msg.text)}
                      title="Read aloud"
                      className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors ${
                        speakingMessageId === msg.id
                          ? 'bg-emerald-500/30 text-emerald-300 animate-pulse'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Volume2 size={15} />
                    </button>
                  )}

                  <div className="pr-6 font-sans">
                    {renderStructuredChatMessage(msg.text, onSearchMedicine, onClose)}
                  </div>

                  {/* Interactive Medicine Search Cards */}
                  {msg.suggestedMedicines && msg.suggestedMedicines.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-slate-800/80 space-y-2">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                        <Search size={12} /> Find Suggested OTC Medicines Nearby:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.suggestedMedicines.map((med, idx) => (
                          <motion.button
                            key={idx}
                            whileHover={{ scale: 1.02, x: 3 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              onSearchMedicine(med);
                              onClose();
                            }}
                            className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/50 to-slate-900/90 hover:from-emerald-900/60 hover:to-slate-900 border border-emerald-500/30 hover:border-emerald-400/60 text-slate-200 text-xs font-semibold flex items-center justify-between gap-2 shadow-md shadow-emerald-950/30 transition-all group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 grid place-items-center shrink-0">
                                <Search size={13} />
                              </div>
                              <div className="truncate text-left">
                                <span className="font-bold text-emerald-300 block text-xs truncate">{med}</span>
                                <span className="text-[10px] text-slate-400">Search in MedFind</span>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-emerald-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  <span className="block text-[10px] text-slate-500 mt-2.5 text-right font-medium">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 grid place-items-center text-slate-300 shrink-0 mt-1 shadow-md">
                    <User size={16} />
                  </div>
                )}
              </motion.div>
            ))}

            {/* Typing Indicator */}
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 items-center text-slate-400 text-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 grid place-items-center text-emerald-400">
                  <Bot size={16} />
                </div>
                <div className="bg-slate-900/90 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-2.5 shadow-md">
                  <span className="text-slate-400 text-xs font-medium">Analyzing symptoms with Gemini AI...</span>
                  <div className="flex gap-1">
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 rounded-full bg-emerald-400" />
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 rounded-full bg-emerald-400" />
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Symptom Starter Chips (NO HORIZONTAL SCROLLBAR) */}
          <div className="p-3 bg-slate-950/90 border-t border-slate-800/80">
            <p className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-400" /> Quick Symptom Starters:
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {STARTER_CHIPS.map((chip, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSendSymptoms(chip.text)}
                  disabled={isAnalyzing}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800/80 text-slate-300 hover:text-white text-xs font-semibold whitespace-nowrap transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {chip.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Unified Floating Message Composer (Input Area) */}
          <div className="p-3 md:p-4 bg-slate-950 border-t border-slate-800/90">
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-2 sm:p-2.5 flex items-end gap-2 shadow-xl shadow-slate-950/60 focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              {/* Voice Button */}
              <button
                onClick={toggleVoiceRecording}
                title={isRecording ? 'Stop Recording' : 'Voice Input'}
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/40'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                }`}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Textarea */}
              <textarea
                value={inputSymptoms}
                onChange={(e) => setInputSymptoms(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendSymptoms();
                  }
                }}
                placeholder={isRecording ? 'Listening to your symptoms...' : `Describe symptoms in ${selectedLanguage}...`}
                rows={1}
                className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-0 resize-none max-h-32 min-h-[40px] py-2 px-1 leading-relaxed"
              />

              {/* Send Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSendSymptoms()}
                disabled={!inputSymptoms.trim() || isAnalyzing}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center shrink-0"
              >
                <Send size={16} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/** Helper to render structured markdown with emergency warning & disclaimer callouts */
function renderStructuredChatMessage(
  text: string,
  onSearchMedicine: (med: string) => void,
  onClose: () => void
) {
  const cleaned = text.replace(/\(SEARCH_TAG:[^\)]+\)/gi, '');
  const lines = cleaned.split('\n');

  return lines.map((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.includes('Emergency Warning') || trimmed.includes('Señales de Emergencia') || trimmed.includes('आपातकालीन') || trimmed.includes('Signes d\'urgence')) {
      return (
        <div key={idx} className="my-3 p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs sm:text-sm shadow-md flex items-start gap-3">
          <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
          <div>
            <b className="text-rose-300 font-extrabold block text-xs uppercase tracking-wider mb-0.5">Emergency Warning:</b>
            <span>{line.replace(/[*#]/g, '')}</span>
          </div>
        </div>
      );
    }

    if (trimmed.includes('Disclaimer') || trimmed.includes('Aviso Médico') || trimmed.includes('चिकित्सा अस्वीकरण') || trimmed.includes('Avertissement médical')) {
      return (
        <div key={idx} className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs flex items-start gap-2.5">
          <Stethoscope size={15} className="text-slate-500 shrink-0 mt-0.5" />
          <div>
            <b className="text-slate-300 font-bold block text-[11px] uppercase tracking-wider mb-0.5">Medical Disclaimer:</b>
            <span>{line.replace(/[*#]/g, '')}</span>
          </div>
        </div>
      );
    }

    const isHeading = line.startsWith('🩺') || line.startsWith('💊') || line.startsWith('📋') || line.startsWith('⚠️') || line.startsWith('🚨') || line.startsWith('⚕️');

    return (
      <React.Fragment key={idx}>
        <span className={isHeading ? 'font-bold text-emerald-300 block mt-3 mb-1 text-xs sm:text-sm uppercase tracking-wider' : ''}>
          {line}
        </span>
        {idx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}
