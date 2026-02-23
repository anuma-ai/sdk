export type WhisperModel =
  | "whisper-tiny"
  | "whisper-tiny.en"
  | "whisper-base"
  | "whisper-base.en"
  | "whisper-small"
  | "whisper-small.en";

export interface VoiceRecording {
  /** Audio blob from MediaRecorder */
  blob: Blob;
  /** Recording duration in milliseconds */
  duration: number;
  /** MIME type of the recording (e.g. "audio/webm") */
  mimeType: string;
}

export interface TranscriptionResult {
  /** Transcribed text */
  text: string;
  /** Word/phrase-level timestamps if available */
  chunks?: Array<{ text: string; timestamp: [number, number] }>;
}

export interface ModelLoadProgress {
  /** File being downloaded */
  file: string;
  /** Download progress 0-1 */
  progress: number;
  /** Bytes loaded */
  loaded: number;
  /** Total bytes */
  total: number;
}
