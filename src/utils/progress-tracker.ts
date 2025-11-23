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
    const { currentStep, totalSteps, toolsUsed, elapsedTime, steps } = this.state;
    const progress = Math.min(100, Math.floor((currentStep / totalSteps) * 100));
    const barLength = 30;
    const filledLength = Math.min(barLength, Math.floor((progress / 100) * barLength));
    const bar = "█".repeat(filledLength) + "░".repeat(barLength - filledLength);

    console.clear();

    const width = 66;
    console.log(colors.cyan("┌" + "─".repeat(width) + "┐"));
    console.log(
      colors.cyan("│") +
        colors.bold(` 🤖 DEVSCOUT ANALYSIS`.padEnd(width)) +
        colors.cyan("│"),
    );
    console.log(colors.cyan("├" + "─".repeat(width) + "┤"));
    console.log(
      colors.cyan("│") +
        ` Progress: [${colors.green(bar)}] ${progress}%`.padEnd(width + 10) +
        colors.cyan("│"),
    );
    console.log(colors.cyan("│") + ` Time: ${elapsedTime.toFixed(1)}s`.padEnd(width) + colors.cyan("│"));
    console.log(colors.cyan("│") + ` Tools used: ${toolsUsed}`.padEnd(width) + colors.cyan("│"));
    console.log(colors.cyan("├" + "─".repeat(width) + "┤"));

    steps.forEach((step) => {
      let icon = "⏸️";
      let statusText = "";

      if (step.status === "completed") {
        icon = "✓";
        statusText = step.duration !== undefined ? `${step.duration.toFixed(1)}s` : "";
      } else if (step.status === "running") {
        icon = "⏳";
      } else if (step.status === "failed") {
        icon = "✗";
      }

      const line = ` ${icon} ${step.name}`;
      const padding = Math.max(0, width - line.length - statusText.length);
      console.log(colors.cyan("│") + colors.gray(line) + " ".repeat(padding) + colors.gray(statusText) +
        colors.cyan("│"));
    });

    console.log(colors.cyan("└" + "─".repeat(width) + "┘"));
  }
}
