import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  pendingUpdates?: any;       // State updates proposed but not yet applied
  updateStatus?: 'pending' | 'applied' | 'skipped';
}

interface CreditState {
  remaining: number;
  resetDate: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  accessCode: string;
  currentState: any;
  onStateUpdate: (updates: any) => void;
  apiBase: string;
}

const CREDITS_KEY = 'tm_ai_credits';
const MONTHLY_CREDITS = 200;

function getCredits(): CreditState {
  try {
    const stored = localStorage.getItem(CREDITS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (new Date(parsed.resetDate) <= new Date()) return resetCredits();
      return parsed;
    }
  } catch {}
  return resetCredits();
}

function resetCredits(): CreditState {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const state: CreditState = { remaining: MONTHLY_CREDITS, resetDate: nextMonth.toISOString() };
  localStorage.setItem(CREDITS_KEY, JSON.stringify(state));
  return state;
}

function spendCredit(): CreditState {
  const current = getCredits();
  current.remaining = Math.max(0, current.remaining - 1);
  localStorage.setItem(CREDITS_KEY, JSON.stringify(current));
  return current;
}

// Human-readable summary of what's being changed
function summarizeUpdates(updates: any): string[] {
  const lines: string[] = [];
  if (!updates || typeof updates !== 'object') return lines;

  const labels: Record<string, string> = {
    skus: '📦 SKU Library',
    logisticsNodes: '🚚 Logistics Nodes',
    warehousing: '🏭 Warehousing',
    overhead: '🏢 Corporate Overhead',
    natl: "📊 Nat'l Distribution",
    club: '📊 Club',
    dsd: '📊 DSD',
    online: '📊 Online D2B',
    alt: '📊 Alt FdSvc',
    dashboard: '📊 Executive Dashboard',
    debtEquity: '💰 Debt vs Equity',
    cashPlan: '💵 13-Week Cash Plan',
    stressTest: '⚡ Stress Test',
  };

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null) continue;
    const label = labels[key] || key;
    if (Array.isArray(value)) {
      lines.push(`${label} — ${value.length} item${value.length !== 1 ? 's' : ''}`);
    } else if (typeof value === 'object') {
      const fields = Object.keys(value as object).length;
      lines.push(`${label} — ${fields} field${fields !== 1 ? 's' : ''}`);
    } else {
      lines.push(`${label} — updated`);
    }
  }
  return lines;
}

export default function ChatPanel({ isOpen, onClose, accessCode, currentState, onStateUpdate, apiBase }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<CreditState>(getCredits());
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const applyUpdates = useCallback((msgIndex: number) => {
    setMessages(prev => {
      const updated = [...prev];
      const msg = updated[msgIndex];
      if (msg?.pendingUpdates && msg.updateStatus === 'pending') {
        onStateUpdate(msg.pendingUpdates);
        updated[msgIndex] = { ...msg, updateStatus: 'applied' };
      }
      return updated;
    });
  }, [onStateUpdate]);

  const skipUpdates = useCallback((msgIndex: number) => {
    setMessages(prev => {
      const updated = [...prev];
      const msg = updated[msgIndex];
      if (msg?.updateStatus === 'pending') {
        updated[msgIndex] = { ...msg, updateStatus: 'skipped' };
      }
      return updated;
    });
  }, []);

  const sendMessage = useCallback(async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    const currentCredits = getCredits();
    if (currentCredits.remaining <= 0) {
      setError('You\'ve used all your AI credits this month. The model still works manually — credits reset on the 1st.');
      return;
    }

    setInput('');
    setError('');
    const userMsg: Message = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode,
          message: msg,
          history: messages.slice(-18),
          currentState,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply,
        pendingUpdates: data.stateUpdates || undefined,
        updateStatus: data.stateUpdates ? 'pending' : undefined,
      };
      setMessages(prev => [...prev, assistantMsg]);

      const updated = spendCredit();
      setCredits(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, accessCode, currentState, apiBase]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px', maxWidth: '100vw',
      background: '#0f172a', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column',
      zIndex: 9999, boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #334155',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#1e293b',
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🧠</span> AI Advisor
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            {credits.remaining} credits remaining this month
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer',
          padding: '4px 8px', borderRadius: '4px',
        }} onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
           onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
          ✕
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>💬</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
              Tell me about your business
            </div>
            <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
              Describe your products, channels, pricing, and costs — I'll propose changes for your approval before touching the model.
            </div>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                '"I make a sparkling water, COGS is $1.20, selling through UNFI at $2.80 to distributor"',
                '"What happens if Costco asks for 20% off-invoice?"',
                '"Add a second SKU — a 4-pack at $3.40 COGS"',
                '"Is my business viable at 500 doors?"',
              ].map((example, i) => (
                <button key={i} onClick={() => { setInput(example.replace(/"/g, '')); inputRef.current?.focus(); }}
                  style={{
                    background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
                    padding: '10px 14px', color: '#cbd5e1', fontSize: '12px', textAlign: 'left',
                    cursor: 'pointer', lineHeight: '1.4',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#6366f1')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}>
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: '16px' }}>
            {/* Message bubble */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '90%',
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? '#4f46e5' : '#1e293b',
                color: msg.role === 'user' ? '#fff' : '#e2e8f0',
                fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
            </div>

            {/* Proposed changes card */}
            {msg.pendingUpdates && (
              <div style={{
                marginTop: '10px',
                background: msg.updateStatus === 'applied' ? '#064e3b'
                  : msg.updateStatus === 'skipped' ? '#1e293b'
                  : '#1a1a2e',
                border: `1px solid ${
                  msg.updateStatus === 'applied' ? '#059669'
                  : msg.updateStatus === 'skipped' ? '#334155'
                  : '#6366f1'
                }`,
                borderRadius: '12px', padding: '14px 16px', maxWidth: '95%',
                opacity: msg.updateStatus === 'skipped' ? 0.5 : 1,
              }}>
                <div style={{
                  fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  color: msg.updateStatus === 'applied' ? '#6ee7b7'
                    : msg.updateStatus === 'skipped' ? '#64748b'
                    : '#a5b4fc',
                  marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  {msg.updateStatus === 'applied' ? '✅ Changes Applied'
                    : msg.updateStatus === 'skipped' ? '⏭️ Changes Skipped'
                    : '📋 Proposed Model Changes'}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: msg.updateStatus === 'pending' ? '12px' : '0' }}>
                  {summarizeUpdates(msg.pendingUpdates).map((line, j) => (
                    <div key={j} style={{ fontSize: '13px', color: '#cbd5e1', padding: '2px 0' }}>
                      {line}
                    </div>
                  ))}
                </div>

                {msg.updateStatus === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      onClick={() => applyUpdates(i)}
                      style={{
                        flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none',
                        background: '#4f46e5', color: '#fff', fontSize: '13px', fontWeight: 700,
                        cursor: 'pointer', transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#4338ca')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#4f46e5')}
                    >
                      ✓ Apply Changes
                    </button>
                    <button
                      onClick={() => skipUpdates(i)}
                      style={{
                        flex: 1, padding: '10px 16px', borderRadius: '8px',
                        border: '1px solid #475569', background: 'transparent',
                        color: '#94a3b8', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#64748b'; e.currentTarget.style.color = '#cbd5e1'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#94a3b8'; }}
                    >
                      Skip
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{
              padding: '12px 16px', borderRadius: '16px 16px 16px 4px',
              background: '#1e293b', color: '#94a3b8', fontSize: '14px',
            }}>
              <span className="typing-dots">Thinking</span>
              <style>{`
                @keyframes blink { 0%, 20% { opacity: 1; } 50% { opacity: 0.3; } 80%, 100% { opacity: 1; } }
                .typing-dots::after { content: '...'; animation: blink 1.4s infinite; }
              `}</style>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 20px', background: '#7f1d1d', color: '#fca5a5', fontSize: '13px',
          borderTop: '1px solid #991b1b',
        }}>
          {error}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '16px 20px', borderTop: '1px solid #334155', background: '#1e293b',
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={credits.remaining > 0 ? 'Ask me anything about your CPG model...' : 'Credits exhausted — resets on the 1st'}
            disabled={credits.remaining <= 0}
            rows={1}
            style={{
              flex: 1, resize: 'none', background: '#0f172a', border: '1px solid #334155',
              borderRadius: '12px', padding: '12px 16px', color: '#f1f5f9', fontSize: '14px',
              outline: 'none', fontFamily: 'inherit', lineHeight: '1.4',
              maxHeight: '120px', overflowY: 'auto',
              opacity: credits.remaining <= 0 ? 0.5 : 1,
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
            onBlur={e => (e.currentTarget.style.borderColor = '#334155')}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || credits.remaining <= 0}
            style={{
              background: loading || !input.trim() ? '#334155' : '#4f46e5',
              color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 16px',
              fontSize: '16px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s', flexShrink: 0, height: '44px',
            }}
            onMouseEnter={e => { if (!loading && input.trim()) e.currentTarget.style.background = '#4338ca'; }}
            onMouseLeave={e => { if (!loading && input.trim()) e.currentTarget.style.background = '#4f46e5'; }}
          >
            ↑
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#475569', marginTop: '8px', textAlign: 'center' }}>
          Shift+Enter for new line · Enter to send · {credits.remaining}/{MONTHLY_CREDITS} credits
        </div>
      </div>
    </div>
  );
}
