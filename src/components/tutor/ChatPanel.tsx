"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Send } from "lucide-react";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "What should I study today?",
  "Explain my mistakes",
  "Why am I still stuck at this band?",
  "How can I improve fastest?",
];

export function ChatPanel({ initialMessages }: { initialMessages: ChatMessageData[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tmpIdRef = useRef(0);
  const nextTmpId = () => `tmp-${++tmpIdRef.current}`;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    const userMsg: ChatMessageData = { id: nextTmpId(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    try {
      const res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { id: nextTmpId(), role: "assistant", content: data.reply ?? "Sorry, something went wrong." }]);
    } catch {
      setMessages((m) => [...m, { id: nextTmpId(), role: "assistant", content: "Sorry, something went wrong reaching the tutor." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-80px)]">
      <div className="flex-1 overflow-y-auto px-1 py-2 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Ask about your mistakes, your progress, or what to study today. Your tutor remembers your history.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={clsx(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                m.role === "user" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-text)]"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-2.5 text-sm bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-3 border-t border-[var(--color-border)] safe-bottom">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask your tutor..."
          className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm"
        />
        <button
          onClick={() => send(input)}
          disabled={sending || !input.trim()}
          className="w-11 h-11 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center disabled:opacity-50 shrink-0"
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
