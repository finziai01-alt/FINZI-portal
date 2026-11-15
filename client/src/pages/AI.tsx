import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  aiConversationsList, aiMessagesGet, aiMessageSend, aiApprovalsList,
} from '../services/api';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Bot, Send, MessageCircle, Check, AlertTriangle, Clock, Mic, MicOff, Volume2, VolumeOff } from 'lucide-react';
import { formatMoneyIN } from '../utils/format';

export default function AI() {
  const { state } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Voice capabilities availability
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const speechSynthesis = window.speechSynthesis;

  useEffect(() => {
    loadConversations();

    // Initialize speech synthesis
    if (speechSynthesis) {
      synthRef.current = speechSynthesis;
      synthRef.current.onvoiceschanged = () => {
        // Voices loaded
      };
    }

    // Initialize speech recognition
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN'; // English (India)
      rec.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setVoiceListening(false);
      };
      rec.onerror = (event: SpeechRecognitionEvent) => {
        console.error('Speech recognition error', event.error);
        setVoiceError('Voice input not available. Use keyboard instead.');
        setVoiceListening(false);
      };
      rec.onend = () => {
        setVoiceListening(false);
      };
      recognitionRef.current = rec;
    } else {
      setVoiceError('Voice input not supported in this browser.');
    }

    return () => {
      if (synthRef.current) synthRef.current.cancel();
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const loadConversations = async () => {
    try {
      const res = await aiConversationsList();
      setConversations(res.data.conversations || []);
      if (res.data.conversations && res.data.conversations.length > 0) {
        setCurrentConvId(res.data.conversations[0].id);
        loadMessages(res.data.conversations[0].id);
      }
    } catch {}
  };

  const loadMessages = async (convId: string) => {
    try {
      const res = await aiMessagesGet(convId);
      setMessages(res.data.messages || []);
    } catch {}
  };

  const speakText = useCallback((text: string) => {
    if (!synthRef.current || voiceSpeaking) return;
    const cleanText = text.replace(/[^\w\s.,!?-]/g, ' ').slice(0, 500);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-IN';
    utterance.rate = 1;
    utterance.pitch = 1;
    // Prefer Indian English voice if available
    const voices = synthRef.current.getVoices();
    const indianVoice = voices.find(
      (v) => v.lang.startsWith('en-IN') || v.name.toLowerCase().includes('indian')
    );
    if (indianVoice) utterance.voice = indianVoice;
    utterance.onstart = () => setVoiceSpeaking(true);
    utterance.onend = () => setVoiceSpeaking(false);
    utterance.onerror = () => setVoiceSpeaking(false);
    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [voiceSpeaking]);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setVoiceSpeaking(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setVoiceError(null);
    setVoiceListening(true);
    recognitionRef.current.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      setVoiceListening(false);
    }
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    stopSpeaking();
    try {
      await aiMessageSend({ conversation_id: currentConvId!, content: input });
      setInput('');
    } catch {}
    setSending(false);
  };

  const handleSendVoice = async () => {
    if (!input.trim()) return;
    setSending(true);
    stopSpeaking();
    try {
      await aiMessageSend({ conversation_id: currentConvId!, content: input });
      setInput('');
    } catch {}
    setSending(false);
  };

  // Speak the latest assistant message when it arrives
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.role === 'assistant' && voiceEnabled && !voiceSpeaking) {
      speakText(last.content);
    }
  }, [messages, voiceEnabled, voiceSpeaking, speakText]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse bg-surface border border-border rounded-lg p-8 h-64 flex items-center justify-center">
          <div className="text-secondary-text">Loading...</div>
        </div>
      </div>
    );
  }

  const voiceAvailable = Boolean(SpeechRecognition && speechSynthesis);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">FINZI AI Assistant</h1>
          <p className="text-secondary-text">
            AI-powered accounting assistance with human approval workflow.{' '}
            {voiceAvailable ? 'Voice input & output enabled.' : 'Voice not supported in this browser.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {voiceAvailable && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`text-xs ${voiceEnabled ? 'bg-green/10 text-green border-secondary' : ''}`}
              >
                <Volume2 size={12} className="mr-1" /> Voice Output
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={voiceListening ? stopListening : startListening}
                disabled={voiceListening}
                className={`text-xs ${voiceListening ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : ''}`}
              >
                {voiceListening ? (
                  <>
                    <MicOff size={12} className="mr-1" />
                    <span>Listening…</span>
                  </>
                ) : (
                  <>
                    <Mic size={12} className="mr-1" />
                    <span>Voice Input</span>
                  </>
                )}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm">New Conversation</Button>
          <Button variant="green" size="sm">View Approvals</Button>
        </div>
      </div>

      {voiceError && (
        <div className="mb-4 p-3 rounded-md bg-surface-container-low border border-outline text-secondary-text text-sm flex items-center gap-2">
          <AlertTriangle size={14} />
          {voiceError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-160px)]">
        <div className="lg:col-span-4 h-full">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <MessageCircle size={16} /> Conversations
              </h2>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <div className="space-y-1">
                {loading ? (
                  <div className="p-4 text-center text-secondary-text animate-pulse">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-secondary-text">
                    <p>No conversations yet</p>
                    <Button variant="outline" size="sm" className="w-full mt-2">Start New</Button>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => { setCurrentConvId(conv.id); loadMessages(conv.id); }}
                      className={`p-3 cursor-pointer border-b border-border hover:bg-surface-container-low ${
                        currentConvId === conv.id ? 'bg-green/10 border-secondary' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-primary-text truncate">{conv.title}</p>
                        <p className="text-xs text-secondary-text">{new Date(conv.updated_at).toLocaleDateString()}</p>
                      </div>
                      <p className="text-xs text-secondary-text truncate mt-1">{conv.last_message || 'No messages'}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 h-full flex flex-col">
          {currentConvId ? (
            <>
              <Card className="flex-1 flex flex-col border-t-0">
                <CardHeader className="pb-3 border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot size={16} className="text-green" />
                      <h2 className="text-sm font-semibold">FINZI AI</h2>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-secondary-text">Powered by FINZI AI</span>
                      {voiceSpeaking && (
                        <span className="flex items-center gap-1 text-xs text-green">
                          <Volume2 size={12} /> Speaking
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-secondary-text">
                      <Bot size={48} opacity={0.3} className="mb-3" />
                      <p>Start a conversation with FINZI AI</p>
                    </div>
                  ) : (
                    <>
                      <div ref={messagesEndRef} />
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-green text-white rounded-tl-none'
                              : 'bg-surface-container-low text-primary-text rounded-tr-none'
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                            {msg.role === 'assistant' && voiceEnabled && voiceSpeaking === false && (
                              <Button
                                key="speak"
                                variant="ghost"
                                size="sm"
                                onClick={() => speakText(msg.content)}
                                className="mt-2 text-xs"
                              >
                                <Volume2 size={12} className="mr-1" /> Speak
                              </Button>
                            )}
                            {msg.role === 'assistant' && msg.suggested_actions && (
                              <div className="mt-2 flex gap-2">
                                {Array.isArray(msg.suggested_actions) ? msg.suggested_actions.slice(0, 3).map((a: any, i: number) => (
                                  <Button key={i} variant="outline" size="sm" onClick={() => {}}>
                                    {a.label || 'Action'}
                                  </Button>
                                )) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </CardContent>
                <div className="border-t border-border p-3 bg-surface">
                  <form onSubmit={handleSend} className="flex gap-2">
                    <Input
                      placeholder={voiceListening ? 'Listening…' : 'Ask FINZI AI about your accounts, GST, or book a task...'}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" variant="green" disabled={sending} className="px-4">
                      {sending ? '' : <Send size={16} />}
                    </Button>
                    {voiceAvailable && voiceListening && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={stopListening}
                        className="text-red-600 hover:bg-red-50"
                        title="Stop listening"
                      >
                        <MicOff size={14} />
                      </Button>
                    )}
                  </form>
                </div>
              </Card>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-secondary-text">
              <Bot size={48} opacity={0.3} className="mb-4" />
              <p>Select a conversation to start</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Pending AI Approvals</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-8 text-secondary-text">
              <Clock size={32} opacity={0.4} className="mb-2" />
              <p>No pending approvals</p>
              <p className="text-xs mt-1">AI-suggested actions appear here for your review</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}





