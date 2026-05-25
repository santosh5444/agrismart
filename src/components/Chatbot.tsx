import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bot, Loader2, Sparkles } from 'lucide-react';
import api from '../api';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Hello! I am AgriSmart AI. How can I help you today?' }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || loading) return;

    const userMsg = message.trim();
    setChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setMessage('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: userMsg });
      if (res.data.success) {
        setChat(prev => [...prev, { role: 'bot', text: res.data.reply }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChat(prev => [...prev, { role: 'bot', text: 'Oops! Something went wrong while processing your request.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-4 sm:right-8 w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all z-[100] animate-glow"
        style={{ boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)' }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div 
          className="fixed bottom-24 right-4 sm:right-8 w-[calc(100vw-2rem)] sm:w-[350px] max-h-[500px] flex flex-col rounded-3xl overflow-hidden glass-card z-[100] animate-scale-in"
          style={{ 
            background: 'rgba(10, 15, 30, 0.95)',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-white/5 bg-green-500/10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/20">
                <Bot className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">AgriSmart AI</h3>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Online</span>
                </div>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-yellow-400 animate-glow" />
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar min-h-[300px]"
          >
            {chat.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white/10 text-slate-200 rounded-bl-none border border-white/5'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 p-3 rounded-2xl rounded-bl-none">
                  <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-white/5">
            <div className="relative">
              <input 
                type="text" 
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Ask me anything..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-green-500/50 transition-all pr-10"
              />
              <button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-green-400 hover:text-green-300"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
