export type RecordingMode = "toggle" | "push-to-hold";

export type AudioConfig = {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  chunkIntervalMs: number;
};

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16,
  chunkIntervalMs: 100,
};

export type TranscriptionSegment = {
  id: number;
  text: string;
  start?: number;
  end?: number;
  is_final?: boolean;
};

export type STTServerMessage = {
  segments?: TranscriptionSegment[];
  text?: string;
  error?: string;
  done?: boolean;
};

export type STTErrorCode =
  | "PERMISSION_DENIED"
  | "MICROPHONE_NOT_FOUND"
  | "BROWSER_NOT_SUPPORTED"
  | "WEBSOCKET_ERROR"
  | "WEBSOCKET_CLOSED"
  | "MAX_DURATION_REACHED"
  | "AUDIO_PROCESSING_ERROR"
  | "AUTH_ERROR"
  | "UNKNOWN_ERROR";

export type STTError = {
  code: STTErrorCode;
  message: string;
  cause?: Error;
};

export type UseSTTOptions = {
  getToken?: () => Promise<string | null>;
  baseUrl?: string;
  language?: string;
  mode?: RecordingMode;
  maxDurationSeconds?: number;
  onTranscript?: (transcript: string, segments: TranscriptionSegment[]) => void;
  onError?: (error: STTError) => void;
  onFinish?: (finalTranscript: string) => void;
  onStart?: () => void;
};

export type UseSTTResult = {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  isRecording: boolean;
  transcript: string;
  segments: TranscriptionSegment[];
  error: STTError | null;
  audioLevel: number;
  clearTranscript: () => void;
};
