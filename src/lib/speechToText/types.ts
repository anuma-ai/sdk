/**
 * Worker message protocol for Whisper speech-to-text.
 * The SDK defines these types; the consumer's Web Worker implements them.
 */

/** Messages sent TO the worker */
export type WhisperWorkerIncoming = {
  type: "transcribe";
  audio: Float32Array;
};

/** Messages sent FROM the worker */
export type WhisperWorkerOutgoing =
  | { type: "progress"; progress: number; status: string }
  | { type: "result"; text: string }
  | { type: "error"; message: string };

/** Options for the useSpeechToText hook */
export interface UseSpeechToTextOptions {
  /** Factory that creates the Web Worker. Consumer provides this because bundlers need to resolve worker entry points at build time. */
  createWorker: () => Worker;
  /** Maximum recording duration in seconds. Default: 180 */
  maxDurationSeconds?: number;
  /** Called when transcription completes successfully */
  onTranscript?: (text: string) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
}

/** Return value of the useSpeechToText hook */
export interface UseSpeechToTextResult {
  /** Whether the microphone is actively recording */
  isRecording: boolean;
  /** Whether audio is being transcribed by the worker */
  isTranscribing: boolean;
  /** Whether the Whisper model is being downloaded/loaded */
  isModelLoading: boolean;
  /** Model download progress (0–100) */
  modelProgress: number;
  /** Current audio input level (0–1), useful for waveform visualizations */
  audioLevel: number;
  /** Seconds elapsed since recording started */
  elapsedTime: number;
  /** Start recording from the microphone */
  startRecording: () => Promise<void>;
  /** Stop the current recording and begin transcription */
  stopRecording: () => void;
  /** Toggle recording on/off */
  toggleRecording: () => void;
  /** Current error message, or null */
  error: string | null;
  /** Whether the browser supports MediaRecorder and AudioContext */
  isSupported: boolean;
}
