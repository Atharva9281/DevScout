import { join } from "@std/path";
import type { AgentState } from "../types/index.ts";
import logger from "../utils/logger.ts";

export class CheckpointManager {
  private checkpointDir: string;
  private enabled: boolean;

  constructor(enabled = true) {
    this.checkpointDir = join(Deno.cwd(), "data", "checkpoints");
    this.enabled = enabled;
  }

  async save(state: AgentState): Promise<string> {
    if (!this.enabled) {
      return "";
    }

    const id = `checkpoint_${Date.now()}`;
    const filepath = join(this.checkpointDir, `${id}.json`);

    await Deno.writeTextFile(filepath, JSON.stringify(state, null, 2));
    logger.debug(`Checkpoint saved: ${id}`);

    return id;
  }

  async restore(checkpointId: string): Promise<AgentState> {
    const filepath = join(this.checkpointDir, `${checkpointId}.json`);
    const content = await Deno.readTextFile(filepath);
    return JSON.parse(content);
  }
}
