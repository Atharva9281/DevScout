"use client";

interface StatusButtonProps {
  status: "not_applied" | "applied";
  onToggle?: (status: "not_applied" | "applied") => void;
}

export function StatusButton({ status, onToggle }: StatusButtonProps) {
  const isApplied = status === "applied";
  return (
    <button
      onClick={() => onToggle?.(isApplied ? "not_applied" : "applied")}
      className={`rounded px-2 py-1 text-xs font-semibold ${
        isApplied
          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
          : "bg-[#1b1b1b] text-[#f1f1f1] border border-[#2c2c2c]"
      }`}
    >
      {isApplied ? "Applied" : "Not applied"}
    </button>
  );
}
