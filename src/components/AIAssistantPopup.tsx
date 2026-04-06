import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Phone, PhoneOff, Activity, X, MessageSquare, Send, Bot, User, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const AIAssistantPopup = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  
  // Voice State
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  // Chat State
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;

    const initialInput = input;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      setInput((initialInput ? initialInput + ' ' : '') + finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  };

  // Auto-scroll chat
  useEffect(() => {
    if (mode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, mode, isOpen]);

  // --- VOICE LOGIC ---
  const startCall = async () => {
    if (!user) return;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      recordingContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      nextPlayTimeRef.current = 0;
      activeSourcesRef.current = [];
      
      sessionRef.current = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setTranscript(prev => [...prev, "Connected to AI Assistant."]);
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
              const source = recordingContextRef.current!.createMediaStreamSource(stream);
              const processor = recordingContextRef.current!.createScriptProcessor(4096, 1, 1);
              
              processor.onaudioprocess = (e) => {
                if (isMuted) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                }
                
                const buffer = new ArrayBuffer(pcmData.length * 2);
                const view = new DataView(buffer);
                for (let i = 0; i < pcmData.length; i++) {
                  view.setInt16(i * 2, pcmData[i], true);
                }
                
                let binary = '';
                const bytes = new Uint8Array(buffer);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64Data = btoa(binary);
                
                sessionRef.current?.then((session: any) => {
                  session.sendRealtimeInput({
                    media: {
                      mimeType: "audio/pcm;rate=16000",
                      data: base64Data
                    }
                  });
                });
              };
              
              source.connect(processor);
              processor.connect(recordingContextRef.current!.destination);
            }).catch(err => {
              console.error("Microphone error:", err);
              setTranscript(prev => [...prev, "Microphone access denied."]);
              endCall();
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(source => {
                try { source.stop(); } catch (e) {}
              });
              activeSourcesRef.current = [];
              nextPlayTimeRef.current = 0;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const binaryString = atob(base64Audio);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              const pcmData = new Int16Array(Math.floor(len / 2));
              const dataView = new DataView(bytes.buffer);
              for (let i = 0; i < pcmData.length; i++) {
                pcmData[i] = dataView.getInt16(i * 2, true);
              }
              
              const floatData = new Float32Array(pcmData.length);
              for (let i = 0; i < pcmData.length; i++) {
                floatData[i] = pcmData[i] / 32768.0;
              }
              
              const audioBuffer = audioContextRef.current.createBuffer(1, floatData.length, 24000);
              audioBuffer.getChannelData(0).set(floatData);
              
              const source = audioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContextRef.current.destination);
              
              const currentTime = audioContextRef.current.currentTime;
              if (nextPlayTimeRef.current < currentTime) {
                // Add a small buffer to prevent immediate underrun on the next chunk
                nextPlayTimeRef.current = currentTime + 0.1; 
              }
              
              source.start(nextPlayTimeRef.current);
              nextPlayTimeRef.current += audioBuffer.duration;
              
              activeSourcesRef.current.push(source);
              source.onended = () => {
                activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
              };
            }
          },
          onclose: () => {
            setIsConnected(false);
            setTranscript(prev => [...prev, "Call ended."]);
          },
          onerror: (error: any) => {
            console.error("Live API Error:", error);
            setIsConnected(false);
            setTranscript(prev => [...prev, "Error connecting to AI."]);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are a helpful AI assistant in a productivity app. Keep your answers brief and conversational.",
        },
      });
    } catch (error) {
      console.error("Failed to start call:", error);
    }
  };

  const endCall = () => {
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close());
      setIsConnected(false);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (recordingContextRef.current) {
      recordingContextRef.current.close();
    }
  };

  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  // --- CHAT LOGIC ---
  const handleSend = async () => {
    if (!input.trim() || !user) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const chat = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: {
          systemInstruction: 'You are an intelligent AI assistant integrated into a productivity app called OwambeNote AI. You help users brainstorm, summarize notes, and answer questions. Keep your answers concise, helpful, and formatted in markdown.',
        }
      });

      const response = await chat.sendMessage({ message: userMessage });
      setMessages(prev => [...prev, { role: 'model', text: response.text || 'I could not generate a response.' }]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error while processing your request.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        drag
        dragConstraints={{ left: typeof window !== 'undefined' ? -window.innerWidth + 60 : -1000, right: 0, top: typeof window !== 'undefined' ? -window.innerHeight + 100 : -1000, bottom: 0 }}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => {
          setTimeout(() => setIsDragging(false), 100);
        }}
        onClick={() => {
          if (!isDragging) setIsOpen(true);
        }}
        style={{ opacity: isOpen ? 0 : 1, pointerEvents: isOpen ? 'none' : 'auto' }}
        className="fixed bottom-24 right-4 md:right-6 w-10 h-10 md:w-14 md:h-14 bg-[#00BFA5] text-white rounded-full shadow-lg hover:bg-[#00A892] transition-colors flex items-center justify-center z-[60] group cursor-grab active:cursor-grabbing"
        title="AI Assistant"
      >
        <Sparkles className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
        {isConnected && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
        )}
      </motion.button>

      {isOpen && (
        <div className="fixed bottom-24 right-4 md:right-6 w-[calc(100vw-2rem)] md:w-96 h-[500px] max-h-[calc(100vh-8rem)] bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col border border-stone-200 dark:border-stone-800 animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#00BFA5] flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm block text-stone-900 dark:text-stone-100">AI Assistant</span>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium uppercase tracking-wider">OwambeNote AI</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex bg-stone-200 dark:bg-stone-800 p-1 rounded-lg mr-2">
            <button 
              onClick={() => setMode('chat')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === 'chat' ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'}`}
            >
              Chat
            </button>
            <button 
              onClick={() => setMode('voice')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${mode === 'voice' ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'}`}
            >
              Voice
              {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            </button>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors p-1.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden relative bg-white dark:bg-stone-900">
        {mode === 'chat' ? (
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 dark:text-stone-500 space-y-3">
                  <Bot className="w-12 h-12 text-stone-200 dark:text-stone-800" />
                  <p className="text-sm font-medium text-stone-600 dark:text-stone-400">How can I help you?</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300' : 'bg-[#00BFA5] text-white'}`}>
                      {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-[80%] ${msg.role === 'user' ? 'bg-[#00BFA5] text-white rounded-tr-none' : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-tl-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#00BFA5] text-white flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3 h-3" />
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 text-sm rounded-tl-none flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-stone-400 dark:bg-stone-600 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-stone-400 dark:bg-stone-600 rounded-full animate-bounce delay-75" />
                    <div className="w-1.5 h-1.5 bg-stone-400 dark:bg-stone-600 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800">
              <div className="relative flex items-center">
                <button
                  onClick={toggleListening}
                  className={`absolute left-2 p-1.5 rounded-full transition-colors z-10 ${isListening ? 'text-red-500 bg-red-100 dark:bg-red-900/30 animate-pulse' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800'}`}
                  title={isListening ? "Stop listening" : "Start speech to text"}
                >
                  <Mic className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={isListening ? "Listening..." : "Ask anything..."}
                  className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-xl py-3 pl-10 pr-12 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="absolute right-1.5 p-1.5 bg-[#00BFA5] text-white rounded-lg hover:bg-[#00A892] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col bg-stone-900 text-white">
            <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-8">
              <div className="relative w-24 h-24 mx-auto">
                <div className={`absolute inset-0 rounded-full border-2 ${isConnected ? 'border-emerald-500 animate-pulse' : 'border-stone-700'}`}></div>
                <div className="absolute inset-2 rounded-full bg-stone-800 flex items-center justify-center">
                  {isConnected ? (
                    <Activity className="w-8 h-8 text-emerald-500" />
                  ) : (
                    <Phone className="w-8 h-8 text-stone-500" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  disabled={!isConnected}
                  className={`p-4 rounded-full transition-colors ${
                    !isConnected ? 'bg-stone-800 text-stone-600' :
                    isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-stone-800 text-white hover:bg-stone-700'
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {isConnected ? (
                  <button
                    onClick={endCall}
                    className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={startCall}
                    className="p-4 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Transcript Area */}
            <div className="h-32 bg-stone-950 p-4 overflow-y-auto text-xs text-stone-400 space-y-2 scrollbar-hide border-t border-stone-800">
              {transcript.length === 0 ? (
                <p className="text-center text-stone-600 mt-8">Tap the phone icon to start</p>
              ) : (
                transcript.map((t, i) => (
                  <p key={i} className="animate-fade-in">{t}</p>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    )}
    </>
  );
};
