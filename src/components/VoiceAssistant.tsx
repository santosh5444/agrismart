import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Volume2, X, Languages, Check, Globe } from 'lucide-react';
import api from '../api';

interface VoiceAssistantProps {
  onCommand: (command: any) => void;
  contextDistrict?: string;
}

const LANGUAGES = [
  { code: 'en-IN', name: 'English', label: 'EN', hint: 'Add 100kg Tomato in Guntur' },
  { code: 'te-IN', name: 'తెలుగు (Telugu)', label: 'TEL', hint: 'గుంటూరులో 100 కేజీల టమోటాలు' },
  { code: 'hi-IN', name: 'हिन्दी (Hindi)', label: 'HIN', hint: 'गुंटूर में 100 किलो टमाटर' },
];

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

export default function VoiceAssistant({ onCommand, contextDistrict }: VoiceAssistantProps) {
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [step, setStep] = useState<'idle' | 'listening' | 'processing' | 'partial' | 'confirming'>('idle');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [missingField, setMissingField] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');

  const isListening = step === 'listening';

  useEffect(() => {
    const SpeechRecognition = window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = selectedLang.code;

    recognition.onstart = () => {
      setShowOverlay(true);
      setTranscript('');
      transcriptRef.current = '';
    };

    recognition.onresult = (event: any) => {
      let currentText = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentText += event.results[i][0].transcript;
      }
      if (currentText) {
        setTranscript(currentText);
        transcriptRef.current = currentText;
      }
    };

    recognition.onerror = (e: any) => {
      console.error('Speech Error:', e.error);
      setStep('idle');
    };

    recognition.onend = () => {
      const val = transcriptRef.current;
      if (val) {
        processTranscript(val);
      } else if (step === 'listening') {
        setStep('idle');
        setTimeout(() => setShowOverlay(false), 1500);
      }
    };

    recognitionRef.current = recognition;
  }, [selectedLang, step]);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLang.code;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const processTranscript = async (text: string) => {
    const lowerText = text.toLowerCase();

    if (step === 'confirming') {
      const yesKeywords = ['yes', 'correct', 'confirm', 'okay', 'ha', 'sare', 'vunnu', 'avu', 'హో', 'సరే', 'అవును'];
      const isYes = yesKeywords.some(k => lowerText.includes(k));
      if (isYes) {
        onCommand(extractedData);
        speak("Listing applied successfully.");
        setStep('idle');
        setTimeout(() => { setShowOverlay(false); setExtractedData(null); }, 2500);
      } else {
        speak("Cancelled. No problem.");
        setStep('idle');
        setExtractedData(null);
        setTimeout(() => setShowOverlay(false), 2000);
      }
      return;
    }

    if (step === 'partial' && missingField) {
      const updatedData = { ...extractedData };
      const numVal = parseFloat(text.replace(/[^0-9.]/g, ''));
      if (missingField === 'vegetable') updatedData.vegetable = text.trim();
      if (missingField === 'quantity') updatedData.quantity = isNaN(numVal) ? 0 : numVal;
      if (missingField === 'price') updatedData.price = isNaN(numVal) ? 0 : numVal;
      validateAndProgress(updatedData);
      return;
    }

    setIsProcessing(true);
    setStep('processing');
    try {
      const res = await api.post('/voice-command', { text, context_district: contextDistrict });
      if (res.data.success && res.data.intent === 'add_crop') {
        validateAndProgress(res.data.data);
      } else {
        if (res.data.speech) speak(res.data.speech);
        onCommand(res.data);
        setStep('idle');
        setTimeout(() => { setShowOverlay(false); setIsProcessing(false); }, 3000);
      }
    } catch (err) {
      setIsProcessing(false);
      setStep('idle');
      setShowOverlay(false);
    }
  };

  const validateAndProgress = (data: any) => {
    setIsProcessing(false);
    setTranscript('');
    transcriptRef.current = '';

    if (!data.vegetable) {
      setStep('partial');
      setMissingField('vegetable');
      setExtractedData(data);
      speak("Understood. Which crop are you listing?");
      setTimeout(() => { setStep('listening'); recognitionRef.current?.start(); }, 2000);
    } else if (!data.quantity || data.quantity <= 0) {
      setStep('partial');
      setMissingField('quantity');
      setExtractedData(data);
      speak(`How many kilograms of ${data.vegetable} do you have?`);
      setTimeout(() => { setStep('listening'); recognitionRef.current?.start(); }, 2200);
    } else if (!data.price || data.price <= 0) {
      setStep('partial');
      setMissingField('price');
      setExtractedData(data);
      speak(`What is the price per kg for your ${data.vegetable}?`);
      setTimeout(() => { setStep('listening'); recognitionRef.current?.start(); }, 2200);
    } else {
      setExtractedData(data);
      setStep('confirming');
      speak(`I've prepared ${data.quantity} kg of ${data.vegetable} at ${data.price} rupees. Should I list it now?`);
    }
  };

  const startListening = () => {
    if (!isSupported) {
      alert('Voice features are not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    setStep('listening');
    try { recognitionRef.current?.start(); } catch {}
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setStep('idle');
  };

  return (
    <>
      <div className="fixed bottom-8 left-8 flex flex-col items-start gap-4 z-50">
        {!isListening && step === 'idle' && (
          <div className="flex gap-2 p-1.5 rounded-full bg-slate-900/80 border border-green-500/30 backdrop-blur-md animate-scale-in shadow-xl">
             {LANGUAGES.map((l) => (
               <button
                 key={l.code}
                 onClick={() => setSelectedLang(l)}
                 className={`w-10 h-10 rounded-full text-[10px] font-black transition-all ${selectedLang.code === l.code ? 'bg-green-500 text-white shadow-lg' : 'text-slate-400'}`}
               >
                 {l.label}
               </button>
             ))}
          </div>
        )}

        <button
          onClick={isListening ? stopListening : startListening}
          className={`p-6 rounded-full shadow-2xl transition-all duration-500 flex flex-col items-center gap-1 ${isListening ? 'bg-red-500 scale-110' : 'bg-green-500 hover:scale-110'}`}
          style={{ boxShadow: isListening ? '0 0 60px rgba(239, 68, 68, 0.4)' : '0 0 40px rgba(34, 197, 94, 0.25)' }}
        >
          {isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white animate-pulse" />}
          <span className="text-[8px] font-black uppercase text-white/80 tracking-widest">{isListening ? 'Stop' : 'Voice'}</span>
          {isListening && <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-20" />}
        </button>
      </div>

      {showOverlay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-slate-900/90 border border-green-500/30 p-8 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-shimmer" />
            <button onClick={() => { setShowOverlay(false); setStep('idle'); }} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            <div className={`p-4 rounded-full mx-auto w-fit mb-6 ${isListening ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
              {step === 'processing' ? <Loader2 className="w-12 h-12 text-green-400 animate-spin" /> : isListening ? <Mic className="w-12 h-12 text-red-500 animate-bounce" /> : <Volume2 className="w-12 h-12 text-green-400" />}
            </div>
            <h3 className="text-xl font-black text-white mb-2">
              {step === 'processing' ? 'Thinking...' : isListening ? 'Listening...' : step === 'confirming' ? 'Confirmation' : step === 'partial' ? 'Info Needed' : 'Completed'}
            </h3>
            <div className="text-slate-400 text-sm min-h-[48px] italic bg-black/20 p-3 rounded-xl border border-white/5 mb-6">
              {transcript ? <span className="text-green-400">"{transcript}"</span> : <span className="opacity-50">{step === 'partial' ? 'Please answer...' : `Try: "${selectedLang.hint}"`}</span>}
            </div>
            {step === 'confirming' && (
              <div className="flex gap-4 justify-center">
                <button onClick={() => processTranscript("yes")} className="px-8 py-2 bg-green-600 rounded-xl text-white font-bold hover:bg-green-500 transition-all shadow-lg">Confirm</button>
                <button onClick={() => processTranscript("no")} className="px-8 py-2 bg-red-600/20 text-red-400 rounded-xl font-bold hover:bg-red-600/40 transition-all border border-red-500/20">Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
