"use client";

import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="rounded-xl border border-[#2c2c2c] bg-[#171717] p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#cfcfcf]" />
          <span className="text-sm text-[#f1f1f1]">{message || "Loading..."}</span>
        </div>
      </div>
    </div>
  );
}
