import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Bot, User, Sparkles, Globe, Volume2, Mic, MicOff,
  AlertTriangle, Search, RefreshCw, Stethoscope, ChevronRight, CheckCircle2,
  Radio, PhoneCall, VolumeX, MessageSquare, Square, RefreshCcw
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

  // Gemini Live Voice Assistant Mode States
  const [isLiveVoiceMode, setIsLiveVoiceMode] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'analyzing' | 'speaking' | 'muted'>('idle');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [latestAiResponse, setLatestAiResponse] = useState<ChatMessage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const liveRecognitionRef = useRef<any>(null);

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

  // Clean up voice synthesis & recognition when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopLiveVoiceSession();
      window.speechSynthesis?.cancel();
    }
  }, [isOpen]);

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

  // ─── Gemini Live AI Voice Assistant Loop ───────────────────────────────────

  const toggleLiveVoiceMode = () => {
    if (!isLiveVoiceMode) {
      setIsLiveVoiceMode(true);
      startLiveVoiceSession();
    } else {
      stopLiveVoiceSession();
      setIsLiveVoiceMode(false);
    }
  };

  const startLiveVoiceSession = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech Recognition is not supported in this browser. Please use text chat mode.');
      setIsLiveVoiceMode(false);
      return;
    }

    window.speechSynthesis?.cancel();
    setVoiceStatus('listening');
    setLiveTranscript('');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

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

    recognition.onstart = () => {
      setVoiceStatus('listening');
    };

    recognition.onresult = (event: any) => {
      let finalStr = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        finalStr += event.results[i][0].transcript;
      }
      setLiveTranscript(finalStr);
    };

    recognition.onend = () => {
      // Auto submit when user finishes speaking
      if (liveRecognitionRef.current && !isMicMuted) {
        const textToAnalyze = liveRecognitionRef.current.finalTranscript || '';
        if (textToAnalyze.trim().length > 2) {
          handleLiveVoiceSubmit(textToAnalyze);
        } else {
          // Restart listening loop if no input
          setTimeout(() => {
            if (isLiveVoiceMode && !isMicMuted) {
              startLiveVoiceSession();
            }
          }, 400);
        }
      }
    };

    recognition.onerror = (err: any) => {
      console.warn('Live voice recognition error:', err);
      if (isLiveVoiceMode && !isMicMuted) {
        setTimeout(() => startLiveVoiceSession(), 1000);
      }
    };

    liveRecognitionRef.current = recognition;
    liveRecognitionRef.current.finalTranscript = '';

    // Attach listener to track final transcript
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setLiveTranscript(transcript);
      liveRecognitionRef.current.finalTranscript = transcript;
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn('Recognition start exception:', e);
    }
  };

  const stopLiveVoiceSession = () => {
    window.speechSynthesis?.cancel();
    if (liveRecognitionRef.current) {
      try {
        liveRecognitionRef.current.stop();
      } catch (e) {}
      liveRecognitionRef.current = null;
    }
    setVoiceStatus('idle');
    setSpeakingMessageId(null);
  };

  const toggleMicMute = () => {
    if (isMicMuted) {
      setIsMicMuted(false);
      startLiveVoiceSession();
    } else {
      setIsMicMuted(true);
      stopLiveVoiceSession();
      setVoiceStatus('muted');
    }
  };

  const interruptSpeech = () => {
    window.speechSynthesis?.cancel();
    setSpeakingMessageId(null);
    if (!isMicMuted) {
      startLiveVoiceSession();
    }
  };

  const handleLiveVoiceSubmit = async (transcript: string) => {
    setVoiceStatus('analyzing');

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: transcript,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLiveTranscript('');

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome-1')
        .slice(-4)
        .map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          content: m.text,
        }));

      const result = await analyzeSymptomsWithGemini(transcript, selectedLanguage, history);

      const aiMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: result.reply,
        suggestedMedicines: result.suggestedMedicines,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setLatestAiResponse(aiMsg);

      // Immediately speak the AI response live!
      speakAiResponseLive(aiMsg);
    } catch (err) {
      console.error('Error analyzing symptoms in live mode:', err);
      setVoiceStatus('listening');
      if (!isMicMuted) startLiveVoiceSession();
    }
  };

  const speakAiResponseLive = (aiMsg: ChatMessage) => {
    if (!('speechSynthesis' in window)) {
      setVoiceStatus('listening');
      if (!isMicMuted) startLiveVoiceSession();
      return;
    }

    setVoiceStatus('speaking');
    window.speechSynthesis.cancel();

    // Clean text for natural speech synthesis
    const cleanText = aiMsg.text
      .replace(/\(SEARCH_TAG:[^\)]+\)/gi, '')
      .replace(/[*#_`~]/g, '')
      .replace(/🩺|💊|📋|⚠️|🚨|⚕️/g, '');

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
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setVoiceStatus('listening');
      if (isLiveVoiceMode && !isMicMuted) {
        setTimeout(() => startLiveVoiceSession(), 600);
      }
    };

    utterance.onerror = () => {
      setVoiceStatus('listening');
      if (isLiveVoiceMode && !isMicMuted) {
        setTimeout(() => startLiveVoiceSession(), 600);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // ─── Text Chat Voice Input (Speech-to-Text Button in Input Bar) ──────────────

  const toggleVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech Recognition is not supported in your browser.');
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

  // Text-to-Speech Handler for chat bubbles
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

  // Submit Symptoms to Gemini AI in Text Mode
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
    stopLiveVoiceSession();
    setSpeakingMessageId(null);
    setLatestAiResponse(null);
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

            {/* Mode Switcher Toggle Button (Live Voice vs Text Chat) */}
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleLiveVoiceMode}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                  isLiveVoiceMode
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-950/50 border border-emerald-400/40 animate-pulse'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {isLiveVoiceMode ? <Radio size={14} className="text-white" /> : <Mic size={14} className="text-emerald-400" />}
                <span>{isLiveVoiceMode ? 'Live Voice' : 'Voice Mode'}</span>
              </motion.button>

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
                    onClick={() => {
                      setSelectedLanguage(lang.code);
                      if (isLiveVoiceMode) {
                        stopLiveVoiceSession();
                        setTimeout(() => startLiveVoiceSession(), 300);
                      }
                    }}
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

          {/* 🎙️ LIVE GEMINI AI VOICE ASSISTANT VIEW OVERLAY */}
          {isLiveVoiceMode ? (
            <div className="flex-1 flex flex-col justify-between p-6 bg-slate-950/80 backdrop-blur-xl relative overflow-hidden">
              {/* Top Status Badge */}
              <div className="flex justify-center">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-bold flex items-center gap-2 shadow-lg"
                >
                  {voiceStatus === 'listening' && (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-emerald-300">Listening to symptoms in {selectedLanguage}...</span>
                    </>
                  )}
                  {voiceStatus === 'analyzing' && (
                    <>
                      <Sparkles size={13} className="text-amber-400 animate-spin" />
                      <span className="text-amber-300">Gemini AI is evaluating symptoms...</span>
                    </>
                  )}
                  {voiceStatus === 'speaking' && (
                    <>
                      <Volume2 size={14} className="text-cyan-400 animate-bounce" />
                      <span className="text-cyan-300">AI Doctor speaking recommendations...</span>
                    </>
                  )}
                  {voiceStatus === 'muted' && (
                    <>
                      <VolumeX size={14} className="text-rose-400" />
                      <span className="text-rose-300">Microphone Paused</span>
                    </>
                  )}
                </motion.div>
              </div>

              {/* Central Gemini Live Animated Voice Orb */}
              <div className="flex flex-col items-center justify-center my-auto relative py-6">
                {/* Concentric Pulse Rings */}
                <motion.div
                  animate={{
                    scale: voiceStatus === 'listening' ? [1, 1.35, 1] : voiceStatus === 'speaking' ? [1, 1.2, 1] : 1,
                    opacity: voiceStatus === 'listening' ? [0.2, 0.6, 0.2] : 0.2,
                  }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  className="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-cyan-500/20 blur-xl pointer-events-none"
                />

                {/* Main Orb Sphere */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  onClick={voiceStatus === 'speaking' ? interruptSpeech : toggleMicMute}
                  className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 shadow-2xl shadow-emerald-500/40 flex items-center justify-center cursor-pointer border-4 border-slate-950 z-10 group"
                >
                  <div className="w-full h-full rounded-full bg-slate-950/20 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
                    {voiceStatus === 'speaking' ? (
                      <Volume2 size={42} className="text-cyan-200 animate-pulse" />
                    ) : isMicMuted ? (
                      <MicOff size={42} className="text-rose-400" />
                    ) : (
                      <Bot size={42} className="text-emerald-200 group-hover:scale-110 transition-transform" />
                    )}

                    {/* Audio Waveform Bars */}
                    <div className="flex items-center gap-1.5 h-6">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.span
                          key={i}
                          animate={{
                            height: voiceStatus === 'listening' ? [8, 24, 8] : voiceStatus === 'speaking' ? [6, 20, 6] : 6
                          }}
                          transition={{ repeat: Infinity, duration: 0.5 + i * 0.15, ease: 'easeInOut' }}
                          className="w-1 bg-white/80 rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Live Transcript / Feedback Subtext */}
                <div className="mt-6 text-center max-w-md px-4">
                  {liveTranscript ? (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs sm:text-sm font-semibold text-emerald-200 bg-slate-900/80 px-4 py-2 rounded-2xl border border-emerald-500/30 shadow-md inline-block"
                    >
                      "{liveTranscript}"
                    </motion.p>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium">
                      {voiceStatus === 'speaking'
                        ? 'Tap orb to pause AI speech & speak'
                        : isMicMuted
                        ? 'Tap orb to unmute microphone'
                        : 'Speak symptoms clearly in ' + selectedLanguage}
                    </p>
                  )}
                </div>
              </div>

              {/* Latest AI Medicine Recommendation Cards (Live Overlay) */}
              {latestAiResponse && latestAiResponse.suggestedMedicines && latestAiResponse.suggestedMedicines.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl"
                >
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1">
                    <Search size={12} /> Suggested OTC Medicines:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {latestAiResponse.suggestedMedicines.map((med, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          stopLiveVoiceSession();
                          onSearchMedicine(med);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                      >
                        <span>Search "{med}"</span>
                        <ChevronRight size={13} className="text-emerald-400" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Bottom Live Controls Bar */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  onClick={toggleMicMute}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all ${
                    isMicMuted
                      ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  <span>{isMicMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
                </button>

                {voiceStatus === 'speaking' && (
                  <button
                    onClick={interruptSpeech}
                    className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-amber-300 text-xs font-bold flex items-center gap-2 hover:bg-slate-850"
                  >
                    <Square size={14} />
                    <span>Stop AI Voice</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    stopLiveVoiceSession();
                    setIsLiveVoiceMode(false);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-2"
                >
                  <MessageSquare size={15} />
                  <span>Text Mode</span>
                </button>
              </div>
            </div>
          ) : (
            /* 💬 TRADITIONAL TEXT CHAT VIEW */
            <>
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
            </>
          )}
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
