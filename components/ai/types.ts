type AIAvailability =
  | { enabled: true; provider: string; model: string }
  | { enabled: false; message: string };

export type { AIAvailability };
