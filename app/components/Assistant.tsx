'use client';

import { useEffect, useRef, useState } from 'react';
import { IconSparkles, IconX } from './Icons';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 20;

function isChatReply(value: unknown): value is { reply: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const reply = (value as Record<string, unknown>).reply;
  return typeof reply === 'string' && reply.trim().length > 0;
}

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    fetch('/api/health', { cache: 'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((value: unknown) => {
        if (value && typeof value === 'object' && (value as Record<string, unknown>).integrations && typeof ((value as Record<string, unknown>).integrations as Record<string, unknown>).ai === 'boolean') {
          setUnavailable(!((value as Record<string, unknown>).integrations as Record<string, unknown>).ai);
        }
      })
      .catch(() => undefined);
  }, [open]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  async function send() {
    const content = input.trim();
    if (!content || content.length > MAX_MESSAGE_LENGTH || sending) return;
    const history = [...messages, { role: 'user' as const, content }];
    setMessages(history);
    setInput('');
    setSending(true);
    setNotice('');
    const response = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-MAX_HISTORY) }),
    }).catch(() => null);
    setSending(false);
    if (!response?.ok) {
      setMessages(current => current.slice(0, -1));
      setInput(content);
      setNotice('The assistant is unavailable right now. Your message was not sent.');
      return;
    }
    const value: unknown = await response.json().catch(() => null);
    if (!isChatReply(value)) {
      setNotice('The assistant returned an unexpected response.');
      return;
    }
    setMessages(current => [...current, { role: 'assistant', content: value.reply.slice(0, 4000) }]);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Ask NOVA"
          data-tour="assistant-launcher"
          onClick={() => setOpen(true)}
          className="hero-gradient animate-float fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition hover:shadow-2xl active:scale-95"
        >
          <IconSparkles className="h-6 w-6 text-lavender-300" />
        </button>
      )}
      {open && (
        <section
          role="dialog"
          aria-label="NOVA assistant"
          className="animate-pop-in fixed bottom-5 right-5 z-50 flex h-[28rem] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-card bg-white shadow-lift"
        >
          <header className="hero-gradient flex items-center justify-between px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold tracking-tight">NOVA</p>
              <p className="text-xs text-stone-300">Newcomer Onboarding &amp; Virtual Assistant</p>
            </div>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-stone-300 transition hover:bg-white/10 hover:text-white"
            >
              <IconX className="h-4 w-4" />
            </button>
          </header>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="rounded-xl bg-cream p-3 text-sm leading-6 text-stone-600 ring-1 ring-stone-200">
                Hi! I&apos;m NOVA, your guide for your onboarding journey. Ask me anything — how to phrase a learning note, what an activity means, or how to navigate the app.
                {unavailable && <p className="mt-2 font-medium text-peach-700">AI is not configured yet. Add <code className="rounded bg-stone-100 px-1">GROQ_API_KEY</code> and <code className="rounded bg-stone-100 px-1">GROQ_MODEL</code> to <code className="rounded bg-stone-100 px-1">.env.local</code> and restart.</p>}
              </div>
            )}
            {messages.map((message, index) => (
              <div key={index} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <p
                  className={
                    message.role === 'user'
                      ? 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-lavender-600 px-3.5 py-2 text-sm leading-6 text-white'
                      : 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-cream px-3.5 py-2 text-sm leading-6 text-stone-700'
                  }
                >
                  {message.content}
                </p>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <p className="rounded-2xl rounded-bl-sm bg-cream px-4 py-3 text-sm text-stone-500">
                  <span className="animate-pulse-soft">Thinking…</span>
                </p>
              </div>
            )}
            {notice && <p className="text-center text-xs text-peach-700" role="status">{notice}</p>}
          </div>
          <div className="flex items-end gap-2 border-t border-stone-200 p-3">
            <textarea
              ref={inputRef}
              aria-label="Message the assistant"
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={2}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder={unavailable ? 'AI is not configured…' : 'Ask about your onboarding…'}
              className="max-h-24 min-h-11 w-full resize-none rounded-xl border border-stone-200 p-2.5 text-sm"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || !input.trim()}
              className="min-h-11 shrink-0 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </section>
      )}
    </>
  );
}
