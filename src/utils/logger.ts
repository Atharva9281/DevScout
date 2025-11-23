import {
  bold,
  cyan,
  green,
  red,
  yellow,
} from "@std/fmt/colors";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = "info") {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      console.log(cyan(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.log(cyan(`ℹ ${message}`), ...args);
    }
  }

  success(message: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.log(green(`✓ ${message}`), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      console.warn(yellow(`⚠ ${message}`), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog("error")) {
      console.error(red(`✗ ${message}`), ...args);
    }
  }

  step(current: number, total: number, message: string): void {
    if (this.shouldLog("info")) {
      console.log(bold(cyan(`[${current}/${total}] ${message}`)));
    }
  }
}

const logLevel = (Deno.env.get("LOG_LEVEL") as LogLevel) || "info";
const logger = new Logger(logLevel);

export default logger;
