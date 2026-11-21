import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  aiApprovalsList,
  aiConversationsCreate,
  aiConversationsList,
  aiMessageSend,
  aiMessagesGet,
} from '../services/api';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import {
  AlertTriangle,
  Bot,
  Clock,
  MessageCircle,
  Mic,
  MicOff,
  Send,
  Volume2,
} from 'lucide-react';
import { formatDateIN, formatMoneyIN } from '../utils/format';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly [index: number]: SpeechRecognitionAlternativeLike;
  readonly length: number;
}

interface SpeechRecognitionResultsLike {
  readonly [index: number]: SpeechRecognitionResultLike;
  readonly length: number;
}

interface SpeechRecognitionEventLike {
  readonly results: SpeechRecognitionResultsLike;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

interface SuggestedAction {
  label?: string;
  description?: string;
}

const parseSuggestedActions = (value: unknown): SuggestedAction[] => {
  if (Array.isArray(value)) return value as SuggestedAction[];
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as SuggestedAction[] : [];
  } catch {
    return [];
  }
};

export default function AI() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const approvalsRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const speechWindow = window as SpeechRecognitionWindow;
  const SpeechRecognitionConstructor =
    speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  const speechSynthesis = window.speechSynthesis;
  const voiceInputAvailable = Boolean(SpeechRecognitionConstructor);
  const voiceOutputAvailable = Boolean(speechSynthesis);

  const loadConversations = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await aiConversationsList();
      const loadedConversations = res.data?.conversations || [];
      setConversations(loadedConversations);

      if (loadedConversations.length > 0) {
        setCurrentConvId(loadedConversations[0].id);
        await loadMessages(loadedConversations[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load conversations.');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const res = await aiMessagesGet(convId);
      setMessages(res.data?.messages || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load this conversation.');
    }
  };

  const loadApprovals = async () => {
    setApprovalsLoading(true);

    try {
      const res = await aiApprovalsList();
      setApprovals(res.data?.approval_requests || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load approval requests.');
    } finally {
      setApprovalsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    loadApprovals();

    if (speechSynthesis) {
      synthRef.current = speechSynthesis;
    }

    if (SpeechRecognitionConstructor) {
      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';
      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim();
        if (transcript) setInput(transcript);
        setVoiceListening(false);
      };
      recognition.onerror = () => {
        setVoiceError('Voice input could not start. Use the keyboard instead.');
        setVoiceListening(false);
      };
      recognition.onend = () => setVoiceListening(false);
      recognitionRef.current = recognition;
    }

    const unsupported: string[] = [];
    if (!SpeechRecognitionConstructor) unsupported.push('Voice input is not supported in this browser.');
    if (!speechSynthesis) unsupported.push('Voice output is not supported in this browser.');
    if (unsupported.length > 0) setVoiceError(unsupported.join(' '));

    return () => {
      synthRef.current?.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speakText = useCallback((text: string) => {
    if (!synthRef.current || synthRef.current.speaking) return;

    const cleanText = text.replace(/[^\w\s.,!?-]/g, ' ').slice(0, 500);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-IN';
    utterance.rate = 1;
    utterance.pitch = 1;

    const indianVoice = synthRef.current
      .getVoices()
      .find((voice) => voice.lang.startsWith('en-IN') || voice.name.toLowerCase().includes('indian'));
    if (indianVoice) utterance.voice = indianVoice;

    utterance.onstart = () => setVoiceSpeaking(true);
    utterance.onend = () => setVoiceSpeaking(false);
    utterance.onerror = () => setVoiceSpeaking(false);
    synthRef.current.speak(utterance);
  }, []);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && voiceEnabled && !voiceSpeaking) {
      speakText(lastMessage.content);
    }
  }, [messages, voiceEnabled, voiceSpeaking, speakText]);

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setVoiceSpeaking(false);
  };

  const startListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setVoiceError('Voice input is not supported in this browser. Use the keyboard instead.');
      return;
    }

    setVoiceError(null);
    setVoiceListening(true);

    try {
      recognition.start();
    } catch {
      setVoiceListening(false);
      setVoiceError('Voice input could not start. Use the keyboard instead.');
    }
  };

  const stopListening = () => {
    recognitionRef.current?.abort();
    setVoiceListening(false);
  };

  const createConversation = async () => {
    if (creating) return;

    setCreating(true);
    setError(null);
    setMessages([]);

    const title = `Session ${formatDateIN(new Date().toISOString())}`;

    try {
      const res = await aiConversationsCreate({ title });
      const conversationId = res.data?.conversationId;
      if (!conversationId) throw new Error('The server did not return a conversation ID.');

      setConversations((current) => [
        {
          id: conversationId,
          title,
          updated_at: new Date().toISOString(),
          last_message: '',
        },
        ...current,
      ]);
      setCurrentConvId(conversationId);
      setMessages([]);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not create a conversation.');
    } finally {
      setCreating(false);
    }
  };

  const showApprovals = async () => {
    await loadApprovals();
    approvalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || !currentConvId) return;

    setSending(true);
    setError(null);
    stopSpeaking();

    try {
      await aiMessageSend({ conversation_id: currentConvId, content });
      setInput('');
      await loadMessages(currentConvId);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not send this message.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-surface-container-lowest border border-outline rounded-lg p-8 h-64 flex items-center justify-center animate-pulse">
          <div className="text-on-surface-variant">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">FINZI AI Assistant</h1>
          <p className="text-body-md text-body-md text-on-surface-variant">
            AI-powered accounting assistance with human approval workflow.{' '}
            {voiceInputAvailable ? 'Voice input is available.' : 'Voice input is unavailable in this browser.'}
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          {voiceOutputAvailable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVoiceEnabled((enabled) => !enabled)}
              className={`text-xs ${voiceEnabled ? 'bg-secondary-container/40 text-secondary border-secondary' : ''}`}
            >
              <Volume2 size={12} className="text-on-surface-variant mr-1" /> Voice Output
            </Button>
          )}
          {voiceInputAvailable && (
            <Button
              variant="outline"
              size="sm"
              onClick={voiceListening ? stopListening : startListening}
              className={`text-xs ${voiceListening ? 'bg-error-container/40 text-error border-error animate-pulse' : ''}`}
            >
              {voiceListening ? (
                <><MicOff size={12} className="text-error mr-1" /> Stop Listening</>
              ) : (
                <><Mic size={12} className="text-on-surface-variant mr-1" /> Voice Input</>
              )}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={createConversation} disabled={creating}>
            {creating ? 'Creating...' : 'New Conversation'}
          </Button>
          <Button variant="green" size="sm" onClick={showApprovals} disabled={approvalsLoading}>
            {approvalsLoading ? 'Loading...' : 'View Approvals'}
          </Button>
        </div>
      </div>

      {(error || voiceError) && (
        <div className="mb-space-md p-space-md rounded-md bg-error-container/40 border border-error text-error text-sm flex items-center gap-space-sm">
          <AlertTriangle size={14} className="text-secondary shrink-0" />
          {error || voiceError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md h-[calc(100vh-160px)]">
        <div className="lg:col-span-4 h-full">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-space-sm">
              <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight flex items-center gap-2">
                <MessageCircle size={16} className="text-secondary" /> Conversations
              </h2>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <div className="space-y-space-sm">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-on-surface-variant">
                    <p>No conversations yet</p>
                    <Button variant="outline" size="sm" className="w-full mt-space-sm" onClick={createConversation} disabled={creating}>
                      Start New
                    </Button>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => {
                        setCurrentConvId(conversation.id);
                        setError(null);
                        loadMessages(conversation.id);
                      }}
                      className={`p-3 cursor-pointer border-b border-outline hover:bg-surface-container-low ${currentConvId === conversation.id ? 'bg-secondary-container/40 border-secondary' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-on-surface truncate">{conversation.title}</p>
                          <p className="text-xs text-on-surface-variant">{formatDateIN(conversation.updated_at) || '—'}</p>
                        </div>
                        <p className="text-xs text-on-surface-variant truncate mt-space-xs">{conversation.last_message || 'No messages'}</p>
                      </div>
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
              <Card className="flex-1 flex flex-col border-t border-outline">
                <CardHeader className="pb-space-sm border-b border-outline">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot size={16} className="text-secondary" />
                      <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">FINZI AI</h2>
                    </div>
                    <div className="flex items-center gap-space-sm">
                      <span className="text-xs text-on-surface-variant">Powered by FINZI AI</span>
                      {voiceSpeaking && (
                        <span className="flex items-center gap-1 text-xs text-secondary shrink-0">
                          <Volume2 size={12} className="text-secondary" /> Speaking
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-space-md space-y-space-sm">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-on-surface-variant">
                      <Bot size={48} opacity={0.3} className="text-on-surface-variant mb-space-sm" />
                      <p>Start a conversation with FINZI AI</p>
                    </div>
                  ) : (
                    <>
                      <div ref={messagesEndRef} />
                      {messages.map((message) => {
                        const suggestedActions = parseSuggestedActions(message.suggested_actions);

                        return (
                          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg ${message.role === 'user' ? 'bg-secondary text-on-secondary rounded-tl-none' : 'bg-surface-container-low text-on-surface rounded-tr-none'}`}>
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              {message.role === 'assistant' && voiceEnabled && !voiceSpeaking && (
                                <Button key="speak" variant="outline" size="sm" onClick={() => speakText(message.content)} className="mt-space-sm text-xs">
                                  <Volume2 size={12} className="text-on-surface-variant mr-1" /> Speak
                                </Button>
                              )}
                              {message.role === 'assistant' && suggestedActions.length > 0 && (
                                <div className="mt-space-sm flex flex-wrap gap-space-sm">
                                  {suggestedActions.slice(0, 3).map((action, index) => {
                                    const actionText = action.description || action.label || 'Action';
                                    return (
                                      <Button
                                        key={`${message.id}-${index}`}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setInput(actionText)}
                                      >
                                        {actionText}
                                      </Button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </CardContent>
                <div className="border-t border-outline p-space-md bg-surface-container-low">
                  <form onSubmit={handleSend} className="flex gap-space-sm">
                    <Input
                      placeholder={voiceListening ? 'Listening…' : 'Ask FINZI AI about your accounts, GST, or book a task...'}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" variant="green" disabled={sending || !input.trim()} className="px-4">
                      {sending ? '' : <Send size={16} className="text-on-secondary" />}
                    </Button>
                  </form>
                </div>
              </Card>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant">
              <Bot size={48} opacity={0.3} className="text-on-surface-variant mb-space-sm" />
              <p>Select a conversation or start a new one</p>
              <Button variant="outline" size="sm" className="mt-space-sm" onClick={createConversation} disabled={creating}>
                Start New
              </Button>
            </div>
          )}
        </div>
      </div>

      <div ref={approvalsRef} className="mt-space-md scroll-mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-space-md">
              <h2 className="text-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">AI Approval Requests</h2>
              <span className="text-xs text-on-surface-variant">
                {approvals.filter((request) => request.status === 'pending').length} pending
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-space-sm">
            {approvals.length === 0 ? (
              <div className="text-center py-space-xl text-on-surface-variant">
                <Clock size={32} opacity={0.4} className="mb-2 text-on-surface-variant shrink-0" />
                <p>{approvalsLoading ? 'Loading approval requests...' : 'No approval requests'}</p>
                <p className="text-xs text-on-surface-variant mt-space-xs">AI-suggested actions remain pending until a person decides</p>
              </div>
            ) : (
              approvals.map((request) => (
                <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-space-md rounded-lg border border-outline bg-surface-container-low">
                  <div>
                    <p className="text-sm font-medium text-on-surface">{request.description}</p>
                    <p className="text-xs text-on-surface-variant mt-space-xs">
                      {request.request_type || 'AI action'} · {formatDateIN(request.created_at) || 'Date unavailable'} · {formatMoneyIN(request.amount || 0)}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-secondary">
                    {String(request.status || 'pending').replace(/_/g, ' ')}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
