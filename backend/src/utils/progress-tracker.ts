import * as colors from "@std/fmt/colors";

export interface ProgressState {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  toolsUsed: number;
  elapsedTime: number;
  steps: Array<{
    name: string;
    status: "pending" | "running" | "completed" | "failed";
    duration?: number;
  }>;
}

export class ProgressTracker {
  private state: ProgressState;
  private startTime: number;
  private interval?: number;

  constructor(totalSteps: number, stepNames: string[]) {
    this.startTime = Date.now();
    this.state = {
      currentStep: 0,
      totalSteps,
      stepName: stepNames[0] || "",
      toolsUsed: 0,
      elapsedTime: 0,
      steps: stepNames.map((name) => ({
        name,
        status: "pending" as const,
      })),
    };
  }

  start(): void {
    this.interval = setInterval(() => {
      this.state.elapsedTime = (Date.now() - this.startTime) / 1000;
      this.render();
    }, 100) as unknown as number;
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    this.render();
  }

  setStep(index: number, status: "running" | "completed" | "failed", duration?: number): void {
    this.state.currentStep = index + (status === "completed" ? 1 : 0);
    this.state.stepName = this.state.steps[index]?.name ?? "";
    const step = this.state.steps[index];
    if (step) {
      step.status = status;
      if (duration !== undefined) {
        step.duration = duration;
      }
    }
  }

  incrementTools(): void {
    this.state.toolsUsed += 1;
  }

  private render(): void {
    // Suppress CLI dashboard rendering to keep backend logs clean.
    // Frontend consumes step/tool events for live progress display.
    return;
  }
}
