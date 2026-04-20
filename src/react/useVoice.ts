"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type {
  ModelLoadProgress,
  TranscriptionResult,
  VoiceRecording,
  WhisperModel,
} from "../lib/voice";

// Minimal Web Speech API types — only what we use.
// Safari exposes this under the webkit prefix.
interface NativeSpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    [index: number]: {
      readonly isFinal: boolean;
      readonly length: number;
      [index: number]: { readonly transcript: string; readonly confidence: number };
    };
  };
}

interface NativeSpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: NativeSpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

type NativeSpeechRecognitionCtor = new () => NativeSpeechRecognitionInstance;

/**
 * Get the on-device SpeechRecognition constructor, if available.
 * Only returns non-null on iOS where recognition runs entirely on-device.
 * Chrome/Edge send audio to Google servers — excluded for privacy.
 */
function getOnDeviceSpeechRecognition(): NativeSpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) return null;
  const SR =
    (window as unknown as Record<string, unknown>).SpeechRecognition ??
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  return (SR as NativeSpeechRecognitionCtor) ?? null;
}

/**
 * Options for the useVoice hook.
 * @category Hooks
 */
export interface UseVoiceOptions {
  /**
   * Whisper model to use for transcription.
   * Larger models are more accurate but slower to download and run.
   * - `whisper-tiny`: ~40 MB, fastest
   * - `whisper-base`: ~75 MB, balanced
   * - `whisper-small`: ~250 MB, most accurate
   *
   * Append `.en` for English-only variants (slightly faster).
   * @default "whisper-tiny"
   */
  model?: WhisperModel;
  /**
   * Language code for transcription (e.g. "en", "es", "fr").
   * If omitted, Whisper auto-detects the language.
   */
  language?: string;
  /**
   * Called during model download with progress updates.
   * Useful for showing a download progress bar on first use.
   */
  onModelProgress?: (progress: ModelLoadProgress) => void;
}

/**
 * Result returned by the useVoice hook.
 * @category Hooks
 */
export interface UseVoiceResult {
  /** Whether the microphone is currently recording */
  isRecording: boolean;
  /** Start recording from the microphone */
  startRecording: () => Promise<void>;
  /** Stop recording and return the audio */
  stopRecording: () => Promise<VoiceRecording>;
  /** Whether transcription is in progress */
  isTranscribing: boolean;
  /** Transcribe a recording. Uses the last recording if none provided. */
  transcribe: (recording?: VoiceRecording) => Promise<TranscriptionResult>;
  /** Preload the Whisper model so transcription starts instantly later */
  preloadModel: () => Promise<void>;
  /** Dispose the loaded model to free WASM memory. Useful on memory-constrained devices (mobile). */
  disposeModel: () => Promise<void>;
  /** Whether the Whisper model has been loaded */
  isModelLoaded: boolean;
  /** Whether the Whisper model is currently loading/downloading */
  isLoadingModel: boolean;
  /** The last recording */
  recording: VoiceRecording | null;
  /** The last transcription result */
  transcription: TranscriptionResult | null;
  /** Error from the last operation */
  error: Error | null;
  /** Whether on-device speech recognition is available (iOS Safari). No audio leaves the device. */
  nativeSpeechAvailable: boolean;
  /** Start on-device speech recognition. Call stopNativeTranscription() to get the result. */
  startNativeTranscription: () => void;
  /** Stop on-device speech recognition and return the accumulated text. */
  stopNativeTranscription: () => Promise<TranscriptionResult>;
  /** Abort on-device speech recognition without returning a result. */
  abortNativeTranscription: () => void;
  /** Whether on-device speech recognition is currently listening. */
  isNativeListening: boolean;
}

type Pipeline = ((
  audio: Float32Array,
  options?: Record<string, unknown>
) => Promise<{
  text: string;
  chunks?: Array<{ text: string; timestamp: [number, number] }>;
}>) & { dispose?: () => Promise<void> };

const SUPPORTED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") {
    return "audio/webm";
  }
  for (const type of SUPPORTED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "audio/webm";
}

const SAMPLE_RATE = 16000;

async function audioToFloat32(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    // Whisper expects mono 16kHz float32
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0);
    }
    // Mix channels to mono
    const length = audioBuffer.length;
    const mono = new Float32Array(length);
    const channels = audioBuffer.numberOfChannels;
    for (let ch = 0; ch < channels; ch++) {
      const data = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        mono[i] += data[i];
      }
    }
    for (let i = 0; i < length; i++) {
      mono[i] /= channels;
    }
    return mono;
  } finally {
    await audioContext.close();
  }
}

/**
 * React hook for recording voice and transcribing it on-device using Whisper.
 *
 * Transcription runs entirely in the browser via `@huggingface/transformers`
 * (ONNX Runtime + WebAssembly). The Whisper model (~40 MB for tiny) is
 * downloaded on first use and cached by the browser.
 *
 * @example
 * ```tsx
 * const { startRecording, stopRecording, transcribe } = useVoice();
 *
 * const handleStop = async () => {
 *   const recording = await stopRecording();
 *   const { text } = await transcribe(recording);
 *   // Send text to LLM via useChat
 * };
 * ```
 *
 * @category Hooks
 */
export function useVoice(options?: UseVoiceOptions): UseVoiceResult {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [recording, setRecording] = useState<VoiceRecording | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const pipelineRef = useRef<Pipeline | null>(null);
  const modelNameRef = useRef<string | null>(null);

  const getModelName = useCallback(() => {
    const model = options?.model ?? "whisper-tiny";
    return `onnx-community/${model}`;
  }, [options?.model]);

  const loadPipeline = useCallback(async (): Promise<Pipeline> => {
    const modelName = getModelName();

    // Return cached pipeline if model hasn't changed
    if (pipelineRef.current && modelNameRef.current === modelName) {
      return pipelineRef.current;
    }

    setIsLoadingModel(true);
    setError(null);

    try {
      const { pipeline } = await import("@huggingface/transformers");

      const transcriber = await pipeline("automatic-speech-recognition", modelName, {
        dtype: "q4",
        device: "wasm",
        progress_callback: options?.onModelProgress
          ? (progress: { file?: string; progress?: number; loaded?: number; total?: number }) => {
              if (progress.file && progress.progress !== null && progress.progress !== undefined) {
                options.onModelProgress!({
                  file: progress.file,
                  progress: progress.progress / 100,
                  loaded: progress.loaded ?? 0,
                  total: progress.total ?? 0,
                });
              }
            }
          : undefined,
      });

      pipelineRef.current = transcriber as unknown as Pipeline;
      modelNameRef.current = modelName;
      setIsModelLoaded(true);
      return pipelineRef.current;
    } catch (err) {
      const processedError = err instanceof Error ? err : new Error("Failed to load Whisper model");
      setError(processedError);
      throw processedError;
    } finally {
      setIsLoadingModel(false);
    }
  }, [getModelName, options?.onModelProgress]);

  const preloadModel = useCallback(async () => {
    await loadPipeline();
  }, [loadPipeline]);

  const disposeModel = useCallback(async () => {
    const pipe = pipelineRef.current;
    if (pipe?.dispose) {
      await pipe.dispose();
    }
    pipelineRef.current = null;
    modelNameRef.current = null;
    setIsModelLoaded(false);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setRecording(null);
    setTranscription(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (err) {
      const processedError = err instanceof Error ? err : new Error("Failed to start recording");
      setError(processedError);
      throw processedError;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<VoiceRecording> => {
    return new Promise<VoiceRecording>((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        const err = new Error("No active recording");
        setError(err);
        reject(err);
        return;
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const duration = Date.now() - startTimeRef.current;

        // Stop all tracks to release the microphone
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;

        const result: VoiceRecording = { blob, duration, mimeType };
        setRecording(result);
        setIsRecording(false);
        resolve(result);
      };

      recorder.onerror = () => {
        const err = new Error("Recording failed");
        setError(err);
        setIsRecording(false);
        reject(err);
      };

      recorder.stop();
    });
  }, []);

  const transcribe = useCallback(
    async (rec?: VoiceRecording): Promise<TranscriptionResult> => {
      const target = rec ?? recording;
      if (!target) {
        const err = new Error("No recording to transcribe");
        setError(err);
        throw err;
      }

      setIsTranscribing(true);
      setError(null);

      try {
        const pipe = await loadPipeline();
        const audio = await audioToFloat32(target.blob);

        const result = await pipe(audio, {
          language: options?.language,
          return_timestamps: true,
        });

        const transcriptionResult: TranscriptionResult = {
          text: result.text.trim(),
          chunks: result.chunks,
        };

        setTranscription(transcriptionResult);
        return transcriptionResult;
      } catch (err) {
        const processedError = err instanceof Error ? err : new Error("Transcription failed");
        setError(processedError);
        throw processedError;
      } finally {
        setIsTranscribing(false);
      }
    },
    [recording, loadPipeline, options?.language]
  );

  // --- Native on-device speech recognition (iOS Safari) ---
  const nativeSpeechAvailable = useMemo(() => getOnDeviceSpeechRecognition() !== null, []);
  const [isNativeListening, setIsNativeListening] = useState(false);
  const nativeRecognitionRef = useRef<NativeSpeechRecognitionInstance | null>(null);
  const nativeTextRef = useRef("");
  const nativeResolveRef = useRef<((result: TranscriptionResult) => void) | null>(null);

  const startNativeTranscription = useCallback(() => {
    const SR = getOnDeviceSpeechRecognition();
    if (!SR) return;

    nativeTextRef.current = "";
    setError(null);

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = options?.language ?? "";

    recognition.onresult = (event: NativeSpeechRecognitionEvent) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result.isFinal && result[0]) {
          text += result[0].transcript + " ";
        }
      }
      nativeTextRef.current = text.trim();
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setError(new Error(`Speech recognition error: ${event.error}`));
      }
    };

    recognition.onend = () => {
      setIsNativeListening(false);
      nativeRecognitionRef.current = null;
      const resolve = nativeResolveRef.current;
      if (resolve) {
        nativeResolveRef.current = null;
        resolve({ text: nativeTextRef.current });
      }
    };

    nativeRecognitionRef.current = recognition;
    recognition.start();
    setIsNativeListening(true);
  }, [options?.language]);

  const stopNativeTranscription = useCallback((): Promise<TranscriptionResult> => {
    return new Promise((resolve) => {
      const recognition = nativeRecognitionRef.current;
      if (!recognition) {
        resolve({ text: nativeTextRef.current || "" });
        return;
      }
      nativeResolveRef.current = resolve;
      recognition.stop();
    });
  }, []);

  const abortNativeTranscription = useCallback(() => {
    const recognition = nativeRecognitionRef.current;
    if (recognition) {
      nativeResolveRef.current = null;
      recognition.abort();
      nativeRecognitionRef.current = null;
      setIsNativeListening(false);
    }
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    isTranscribing,
    transcribe,
    preloadModel,
    disposeModel,
    isModelLoaded,
    isLoadingModel,
    recording,
    transcription,
    error,
    nativeSpeechAvailable,
    startNativeTranscription,
    stopNativeTranscription,
    abortNativeTranscription,
    isNativeListening,
  };
}
