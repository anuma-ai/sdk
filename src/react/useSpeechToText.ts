import { useCallback, useEffect, useRef, useState } from "react";

import { decodeAudioBlob, getSupportedMimeType } from "../lib/speechToText";
import type {
  UseSpeechToTextOptions,
  UseSpeechToTextResult,
  WhisperWorkerOutgoing,
} from "../lib/speechToText";

const DEFAULT_MAX_DURATION = 180;

/**
 * React hook for on-device speech-to-text using Whisper via a Web Worker.
 *
 * Audio never leaves the browser — recording is captured via MediaRecorder,
 * decoded to 16kHz mono, and sent to a Web Worker running Transformers.js Whisper.
 *
 * The consumer provides a `createWorker` factory because bundlers (webpack/vite/turbopack)
 * need to resolve worker entry points at build time.
 *
 * @example
 * ```tsx
 * const stt = useSpeechToText({
 *   createWorker: () => new Worker(new URL('../workers/whisper.worker.ts', import.meta.url)),
 *   onTranscript: (text) => setPrompt(text),
 * });
 * ```
 *
 * @category Hooks
 */
export function useSpeechToText(
  options: UseSpeechToTextOptions
): UseSpeechToTextResult {
  const {
    createWorker,
    maxDurationSeconds = DEFAULT_MAX_DURATION,
    onTranscript,
    onError,
  } = options;

  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for stable references (avoid stale closures)
  const workerRef = useRef<Worker | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStartingRef = useRef(false);
  const createWorkerRef = useRef(createWorker);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const maxDurationRef = useRef(maxDurationSeconds);

  // Sync callback refs to avoid stale closures
  useEffect(() => {
    createWorkerRef.current = createWorker;
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    maxDurationRef.current = maxDurationSeconds;
  });

  const isSupported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof AudioContext !== "undefined";

  // Cleanup helpers
  const stopAudioLevelPolling = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopMediaTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const cleanupAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  }, []);

  // Worker message handler
  const handleWorkerMessage = useCallback(
    (event: MessageEvent<WhisperWorkerOutgoing>) => {
      const data = event.data;
      switch (data.type) {
        case "progress":
          setIsModelLoading(true);
          setModelProgress(data.progress ?? 0);
          break;
        case "result":
          setIsTranscribing(false);
          setIsModelLoading(false);
          if (data.text) {
            onTranscriptRef.current?.(data.text);
          }
          break;
        case "error":
          setIsTranscribing(false);
          setIsModelLoading(false);
          setError(data.message);
          onErrorRef.current?.(data.message);
          break;
      }
    },
    []
  );

  // Ensure worker exists (lazy creation, reused across recordings)
  const ensureWorker = useCallback(() => {
    if (!workerRef.current) {
      const worker = createWorkerRef.current();
      worker.onmessage = handleWorkerMessage;
      worker.onerror = () => {
        setIsTranscribing(false);
        setIsModelLoading(false);
        const msg = "Speech recognition worker failed";
        setError(msg);
        onErrorRef.current?.(msg);
      };
      workerRef.current = worker;
    }
    return workerRef.current;
  }, [handleWorkerMessage]);

  // Start audio level polling via AnalyserNode
  const startAudioLevelPolling = useCallback(
    (stream: MediaStream) => {
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const poll = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]!;
        }
        const avg = sum / dataArray.length / 255;
        setAudioLevel(avg);
        animationFrameRef.current = requestAnimationFrame(poll);
      };
      animationFrameRef.current = requestAnimationFrame(poll);
    },
    []
  );

  // Process recorded audio
  const processRecording = useCallback(
    async (chunks: Blob[], mimeType: string) => {
      setIsTranscribing(true);
      try {
        const blob = new Blob(chunks, { type: mimeType });
        const audioData = await decodeAudioBlob(blob);

        const worker = ensureWorker();
        worker.postMessage(
          { type: "transcribe", audio: audioData },
          { transfer: [audioData.buffer] }
        );
      } catch (err) {
        setIsTranscribing(false);
        const msg =
          err instanceof Error ? err.message : "Failed to process audio";
        setError(msg);
        onErrorRef.current?.(msg);
      }
    },
    [ensureWorker]
  );

  const startRecording = useCallback(async () => {
    if (isRecording || isStartingRef.current) return;
    if (!isSupported) {
      const msg = "Speech recognition is not supported in this browser";
      setError(msg);
      onErrorRef.current?.(msg);
      return;
    }

    isStartingRef.current = true;
    setError(null);

    try {
      // Create worker early so model can start downloading
      ensureWorker();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: { ideal: 16000 },
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Audio level polling
      startAudioLevelPolling(stream);

      // MediaRecorder
      const mimeType = getSupportedMimeType();
      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const chunks = audioChunksRef.current;
        const type = mimeType || "audio/webm";
        processRecording(chunks, type);
      };

      recorder.start();
      setIsRecording(true);
      setElapsedTime(0);

      // Elapsed timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(elapsed);

        // Auto-stop at max duration
        if (elapsed >= maxDurationRef.current) {
          recorder.stop();
          stopMediaTracks();
          stopAudioLevelPolling();
          cleanupAudioContext();
          stopTimer();
          setIsRecording(false);
        }
      }, 1000);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to start recording";
      setError(msg);
      onErrorRef.current?.(msg);
      // Cleanup on failure
      stopMediaTracks();
      stopAudioLevelPolling();
      cleanupAudioContext();
      stopTimer();
    } finally {
      isStartingRef.current = false;
    }
  }, [
    isRecording,
    isSupported,
    ensureWorker,
    startAudioLevelPolling,
    processRecording,
    stopMediaTracks,
    stopAudioLevelPolling,
    cleanupAudioContext,
    stopTimer,
  ]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    stopMediaTracks();
    stopAudioLevelPolling();
    cleanupAudioContext();
    stopTimer();
    setIsRecording(false);
  }, [stopMediaTracks, stopAudioLevelPolling, cleanupAudioContext, stopTimer]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      stopMediaTracks();
      stopAudioLevelPolling();
      cleanupAudioContext();
      stopTimer();
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [stopMediaTracks, stopAudioLevelPolling, cleanupAudioContext, stopTimer]);

  return {
    isRecording,
    isTranscribing,
    isModelLoading,
    modelProgress,
    audioLevel,
    elapsedTime,
    startRecording,
    stopRecording,
    toggleRecording,
    error,
    isSupported,
  };
}
