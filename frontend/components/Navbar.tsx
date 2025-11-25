"use client";

import { Upload, Settings, CheckCircle } from "lucide-react";

interface NavbarProps {
  onUploadClick?: (file: File) => void;
  resumeFileName?: string;
}

export function Navbar({ onUploadClick, resumeFileName }: NavbarProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadClick?.(file);
  };

  return (
    <div className="flex items-center justify-between border-b border-[#2c2c2c] bg-[#121212] px-4 py-3">
      <div className="text-lg font-semibold text-[#f1f1f1]">Job Application Tracker</div>
      <div className="flex items-center gap-2">
        {resumeFileName && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>{resumeFileName}</span>
          </div>
        )}
        <label className="inline-flex items-center gap-2 rounded bg-[#2d2d2d] px-3 py-1.5 text-xs text-[#f1f1f1] hover:bg-[#3a3a3a] cursor-pointer">
          <Upload className="h-4 w-4" />
          {resumeFileName ? "Change resume" : "Upload resume"}
          <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileChange} />
        </label>
        <button className="rounded bg-[#1b1b1b] p-2 text-[#f1f1f1] border border-[#2c2c2c]">
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
