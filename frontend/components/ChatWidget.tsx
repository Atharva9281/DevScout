"use client";

import { useState } from "react";
import { Send } from "lucide-react";

interface ChatWidgetProps {
  onSend: (message: string) => void;
}

export function ChatWidget({ onSend }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-2 w-72 rounded-lg border border-[#2c2c2c] bg-[#171717] p-3 shadow-lg shadow-black/30">
          <div className="text-sm text-[#f1f1f1] mb-2">Ask DevScout</div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full rounded border border-[#2c2c2c] bg-[#1b1b1b] p-2 text-sm text-[#f1f1f1] focus:outline-none"
            placeholder="e.g., software engineering jobs in Boston"
          />
          <button
            onClick={() => {
              if (!message.trim()) return;
              onSend(message.trim());
              setMessage("");
              setOpen(false);
            }}
            className="mt-2 inline-flex items-center gap-2 rounded bg-[#2d2d2d] px-3 py-1.5 text-xs text-[#f1f1f1] hover:bg-[#3a3a3a]"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-[#2d2d2d] px-4 py-2 text-sm font-semibold text-[#f1f1f1] shadow-lg shadow-black/40 hover:bg-[#3a3a3a]"
      >
        Chat
      </button>
    </div>
  );
}
