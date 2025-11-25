"use client";

import { useState } from "react";
import { Search, Play } from "lucide-react";

interface JobSearchBarProps {
  onSearch: (query: string) => void;
  onRangeChange?: (value: string) => void;
  isLoading?: boolean;
}

export function JobSearchBar({ onSearch, onRangeChange, isLoading }: JobSearchBarProps) {
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("anytime");

  return (
    <div className="rounded-xl border border-[#2c2c2c] bg-[#171717] p-4 flex flex-col gap-3">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 rounded border border-[#2c2c2c] bg-[#1b1b1b] px-3 py-2">
          <Search className="h-4 w-4 text-[#9f9f9f]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g., "software engineer new grad"'
            className="w-full bg-transparent text-sm text-[#f1f1f1] placeholder:text-[#8a8a8a] focus:outline-none"
          />
        </div>
        <select
          value={range}
          onChange={(e) => {
            setRange(e.target.value);
            onRangeChange?.(e.target.value);
          }}
          className="rounded border border-[#2c2c2c] bg-[#1b1b1b] px-3 py-2 text-sm text-[#f1f1f1] focus:outline-none"
        >
          <option value="anytime">Any time</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
        <button
          onClick={() => onSearch(query)}
          disabled={!query || isLoading}
          className="inline-flex items-center justify-center gap-2 rounded bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-[#f1f1f1] hover:bg-[#3a3a3a] disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          Run search
        </button>
      </div>
    </div>
  );
}
