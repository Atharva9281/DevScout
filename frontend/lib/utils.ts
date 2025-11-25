import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(timestamp: number | string): string {
  return new Date(timestamp).toLocaleString();
}

export function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-500";
  if (score >= 6) return "text-yellow-500";
  return "text-red-500";
}

export function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 8) return "default";
  if (score >= 6) return "secondary";
  return "destructive";
}
