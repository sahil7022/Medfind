import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Bot, User, Sparkles, Globe, Volume2, Mic, MicOff,
  AlertTriangle, Search, RefreshCw, Stethoscope, CheckCircle2, ChevronRight
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

    // Map language code for recognition
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
    // Clean markdown text for TTS
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
      // Build conversation history for context
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
      <div className="fixed inset-0 z-50 flex items-center justify-end p-0 md:p-6 bg-slate-950/60 backdrop-blur-sm">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Floating Modal Card */}
        <motion.div
          initial={{ x: '100%', opacity: 0, scale: 0.95 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: '100%', opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative w-full max-w-xl h-full md:h-[90vh] md:max-h-[800px] bg-slate-900 text-white md:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-800 z-10"
        >
          {/* Header */}
          <div className="p-4 md:p-5 bg-gradient-to-r from-slate-900 via-[#173d57] to-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-[#173d57] grid place-items-center shadow-lg shadow-emerald-500/20 text-white font-extrabold">
                  <Bot size={22} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm md:text-base text-white tracking-tight">
                    MedFind AI Symptom Assistant
                  </h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles size={10} /> Gemini 2.5
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Multilingual OTC Medicine Recommendation Engine</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetChat}
                title="Reset Chat"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Top Controls: Language & Medical Disclaimer Banner */}
          <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Globe size={14} className="text-emerald-400" />
              <span className="font-semibold text-slate-300">Language:</span>
            </div>

            {/* Language Selector Dropdown */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar py-1 max-w-[280px] sm:max-w-none">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLanguage(lang.code);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                    selectedLanguage === lang.code
                      ? 'bg-gradient-to-r from-[#173d57] to-emerald-700 text-white shadow-md shadow-emerald-900/30 scale-105 border border-emerald-400/40'
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-950/40">
            {/* Safety Banner */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 shadow-sm"
            >
              <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <b className="font-bold block text-amber-300">Medical Safety Notice:</b>
                AI suggestions are for general information only. If experiencing severe chest pain, breathing difficulty, or high fever, seek emergency medical care immediately.
              </div>
            </motion.div>

            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-xl bg-[#173d57] border border-slate-700 grid place-items-center text-emerald-400 shrink-0 mt-1 shadow-md">
                    <Stethoscope size={16} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs md:text-sm leading-relaxed relative group ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#173d57] to-[#235274] text-white rounded-br-none shadow-lg shadow-[#173d57]/20 border border-slate-700'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
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

                  <div className="pr-6 whitespace-pre-wrap font-sans">
                    {formatMarkdownMessage(msg.text)}
                  </div>

                  {/* Interactive Medicine Search Buttons */}
                  {msg.suggestedMedicines && msg.suggestedMedicines.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800/80">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                        <Search size={12} /> Find Suggested OTC Medicines Nearby:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.suggestedMedicines.map((med, idx) => (
                          <motion.button
                            key={idx}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => {
                              onSearchMedicine(med);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all group"
                          >
                            <span>Search "{med}" on MedFind</span>
                            <ChevronRight size={13} className="text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  <span className="block text-[10px] text-slate-500 mt-2 text-right">
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
                <div className="w-8 h-8 rounded-xl bg-[#173d57] border border-slate-700 grid place-items-center text-emerald-400">
                  <Bot size={16} />
                </div>
                <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-2">
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

          {/* Quick Symptom Starter Chips */}
          <div className="p-3 bg-slate-900 border-t border-slate-800/80">
            <p className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-400" /> Quick Symptom Starters:
            </p>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {STARTER_CHIPS.map((chip, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSendSymptoms(chip.text)}
                  disabled={isAnalyzing}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-200 text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  {chip.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Input Box & Voice Button */}
          <div className="p-3 md:p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <button
              onClick={toggleVoiceRecording}
              title={isRecording ? 'Stop Recording' : 'Voice Input'}
              className={`p-3 rounded-2xl transition-all ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <div className="flex-1 relative">
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
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors resize-none pr-10"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSendSymptoms()}
              disabled={!inputSymptoms.trim() || isAnalyzing}
              className="p-3 rounded-2xl bg-gradient-to-r from-[#173d57] to-emerald-600 hover:from-[#173d57] hover:to-emerald-500 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center shrink-0"
            >
              <Send size={18} />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/** Helper to render simple formatted bold markdown */
function formatMarkdownMessage(text: string) {
  // Strip out SEARCH_TAG internal lines for clean display
  const cleaned = text.replace(/\(SEARCH_TAG:[^\)]+\)/gi, '');

  const lines = cleaned.split('\n');
  return lines.map((line, idx) => {
    const isHeading = line.startsWith('🩺') || line.startsWith('💊') || line.startsWith('📋') || line.startsWith('⚠️') || line.startsWith('🚨') || line.startsWith('⚕️');

    return (
      <React.Fragment key={idx}>
        <span className={isHeading ? 'font-bold text-emerald-300 block mt-2 text-sm' : ''}>
          {line}
        </span>
        {idx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}
