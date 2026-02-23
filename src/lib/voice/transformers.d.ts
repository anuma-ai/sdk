declare module "@huggingface/transformers" {
  export function pipeline(
    task: "automatic-speech-recognition",
    model: string,
    options?: {
      dtype?: string;
      device?: string;
      progress_callback?: (progress: {
        file?: string;
        progress?: number;
        loaded?: number;
        total?: number;
      }) => void;
    }
  ): Promise<
    ((
      audio: Float32Array,
      options?: Record<string, unknown>
    ) => Promise<{
      text: string;
      chunks?: Array<{ text: string; timestamp: [number, number] }>;
    }>) & {
      dispose?: () => Promise<void>;
    }
  >;
}
