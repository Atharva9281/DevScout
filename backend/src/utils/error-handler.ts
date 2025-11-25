import logger from "./logger.ts";

export class DevScoutError extends Error {
  code: string;
  fatal: boolean;

  constructor(message: string, code: string, fatal = true) {
    super(message);
    this.name = "DevScoutError";
    this.code = code;
    this.fatal = fatal;
  }
}

export function throwFatalError(message: string, code: string): never {
  logger.error(`FATAL ${message}`);
  logger.error(`Code ${code}`);
  throw new DevScoutError(message, code, true);
}

export function handleError(error: unknown): never {
  if (error instanceof DevScoutError) {
    logger.error(`FATAL ${error.message}`);
    logger.error(`Code ${error.code}`);
  } else if (error instanceof Error) {
    logger.error(error.message);
    if (error.stack) logger.debug(error.stack);
  } else {
    logger.error("Unknown error occurred");
  }

  Deno.exit(1);
}
