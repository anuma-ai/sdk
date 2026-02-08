export {
  createSTTError,
  requestMicrophoneAccess,
  resample,
  float32ToInt16,
  createAudioPipeline,
} from "./audio";

export type {
  RecordingMode,
  AudioConfig,
  TranscriptionSegment,
  STTServerMessage,
  STTErrorCode,
  STTError,
  UseSTTOptions,
  UseSTTResult,
} from "./types";

export { DEFAULT_AUDIO_CONFIG } from "./types";
