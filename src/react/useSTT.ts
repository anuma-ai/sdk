"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../clientConfig";
import {
  createSTTError,
  requestMicrophoneAccess,
  createAudioPipeline,
} from "../lib/stt/audio";
import { DEFAULT_AUDIO_CONFIG } from "../lib/stt/types";
import type {
  UseSTTOptions,
  UseSTTResult,
  STTError,
  STTServerMessage,
  TranscriptionSegment,
} from "../lib/stt/types";

/**
 * A React hook for real-time speech-to-text via WebSocket streaming.
 *
 * Captures microphone audio, converts it to PCM, streams it over WebSocket
 * to the Portal, and provides real-time transcript updates.
 *
 * @param options - Configuration object
 * @param options.getToken - Async function returning an auth token
 * @param options.baseUrl - Base URL for the WebSocket endpoint
 * @param options.language - Language code for transcription (default: "en")
 * @param options.mode - Recording mode: "toggle" or "push-to-hold" (default: "toggle")
 * @param options.maxDurationSeconds - Max recording duration in seconds (default: 180)
 * @param options.onTranscript - Callback fired on each transcript update
 * @param options.onError - Callback fired on errors
 * @param options.onFinish - Callback fired when recording stops with final transcript
 * @param options.onStart - Callback fired when recording starts
 *
 * @category Hooks
 *
 * @example
 * ```tsx
 * const { isRecording, transcript, startRecording, stopRecording, audioLevel } = useSTT({
 *   getToken: async () => getAuthToken(),
 *   onTranscript: (text) => setInput(text),
 *   onFinish: (finalText) => handleSubmit(finalText),
 * });
 * ```
 */
export function useSTT(options?: UseSTTOptions): UseSTTResult {
  const {
    getToken,
    baseUrl = BASE_URL,
    language = "en",
    mode: _mode = "toggle",
    maxDurationSeconds = 180,
    onTranscript,
    onError,
    onFinish,
    onStart,
  } = options || {};

  // State
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [error, setError] = useState<STTError | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const isRecordingRef = useRef(false);
  const transcriptRef = useRef("");
  const segmentsRef = useRef<TranscriptionSegment[]>([]);

  // Callback refs to avoid dependency churn
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const onFinishRef = useRef(onFinish);
  const onStartRef = useRef(onStart);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    onFinishRef.current = onFinish;
    onStartRef.current = onStart;
  });

  // Internal cleanup
  const internalCleanup = useCallback(() => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
    isRecordingRef.current = false;
    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  const stopRecording = useCallback(() => {
    const finalTranscript = transcriptRef.current;
    internalCleanup();
    if (onFinishRef.current) {
      onFinishRef.current(finalTranscript);
    }
  }, [internalCleanup]);

  const startRecording = useCallback(async () => {
    // Prevent double-start
    if (isRecordingRef.current) {
      return;
    }

    // Clear previous state
    setError(null);
    setTranscript("");
    setSegments([]);
    setAudioLevel(0);
    transcriptRef.current = "";
    segmentsRef.current = [];

    // Validate getToken
    if (!getToken) {
      const err = createSTTError(
        "AUTH_ERROR",
        "getToken function is required"
      );
      setError(err);
      if (onErrorRef.current) onErrorRef.current(err);
      return;
    }

    let token: string | null;
    try {
      token = await getToken();
    } catch (e) {
      const err = createSTTError(
        "AUTH_ERROR",
        "Failed to get authentication token",
        e instanceof Error ? e : new Error(String(e))
      );
      setError(err);
      if (onErrorRef.current) onErrorRef.current(err);
      return;
    }

    if (!token) {
      const err = createSTTError("AUTH_ERROR", "Authentication token is null");
      setError(err);
      if (onErrorRef.current) onErrorRef.current(err);
      return;
    }

    // Request microphone access
    let stream: MediaStream;
    try {
      stream = await requestMicrophoneAccess();
    } catch (e) {
      const sttError = e as STTError;
      setError(sttError);
      if (onErrorRef.current) onErrorRef.current(sttError);
      return;
    }

    // Build WebSocket URL
    const wsUrl = baseUrl
      .replace(/^http/, "ws")
      .replace(/\/$/, "");
    const fullWsUrl = `${wsUrl}/api/v1/audio/transcriptions?language=${encodeURIComponent(language)}&token=${encodeURIComponent(token)}`;

    // Create WebSocket
    const ws = new WebSocket(fullWsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    // Wait for WebSocket to open (with 10s timeout)
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            createSTTError(
              "WEBSOCKET_ERROR",
              "WebSocket connection timed out after 10s"
            )
          );
        }, 10000);

        ws.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          reject(
            createSTTError(
              "WEBSOCKET_ERROR",
              "WebSocket connection failed"
            )
          );
        };

        ws.onclose = (event) => {
          clearTimeout(timeout);
          if (!isRecordingRef.current) {
            reject(
              createSTTError(
                "WEBSOCKET_CLOSED",
                `WebSocket closed before open: code=${event.code}`
              )
            );
          }
        };
      });
    } catch (e) {
      // Stop stream tracks on connection failure
      for (const track of stream.getTracks()) {
        track.stop();
      }
      const sttError = e as STTError;
      setError(sttError);
      if (onErrorRef.current) onErrorRef.current(sttError);
      wsRef.current = null;
      return;
    }

    // Set up WebSocket message handler
    ws.onmessage = (event) => {
      try {
        const data: STTServerMessage = JSON.parse(event.data as string);

        if (data.error) {
          const err = createSTTError("WEBSOCKET_ERROR", data.error);
          setError(err);
          if (onErrorRef.current) onErrorRef.current(err);
          return;
        }

        if (data.segments) {
          segmentsRef.current = data.segments;
          setSegments(data.segments);
        }

        if (data.text !== undefined) {
          transcriptRef.current = data.text;
          setTranscript(data.text);
          if (onTranscriptRef.current) {
            onTranscriptRef.current(data.text, segmentsRef.current);
          }
        }

        if (data.done) {
          stopRecording();
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onerror = () => {
      const err = createSTTError(
        "WEBSOCKET_ERROR",
        "WebSocket connection error"
      );
      setError(err);
      if (onErrorRef.current) onErrorRef.current(err);
      internalCleanup();
    };

    ws.onclose = (event) => {
      if (isRecordingRef.current) {
        // Unexpected close
        const err = createSTTError(
          "WEBSOCKET_CLOSED",
          `WebSocket closed unexpectedly: code=${event.code}`
        );
        setError(err);
        if (onErrorRef.current) onErrorRef.current(err);
        internalCleanup();
      }
    };

    // Start audio pipeline
    try {
      const pipeline = createAudioPipeline(DEFAULT_AUDIO_CONFIG.sampleRate);
      const audioCleanup = pipeline.start(
        stream,
        (pcmBuffer) => {
          if (
            wsRef.current &&
            wsRef.current.readyState === WebSocket.OPEN
          ) {
            wsRef.current.send(pcmBuffer);
          }
        },
        (level) => {
          setAudioLevel(level);
        },
        DEFAULT_AUDIO_CONFIG.chunkIntervalMs
      );
      cleanupRef.current = audioCleanup;
    } catch (e) {
      const err = createSTTError(
        "AUDIO_PROCESSING_ERROR",
        "Failed to start audio pipeline",
        e instanceof Error ? e : new Error(String(e))
      );
      setError(err);
      if (onErrorRef.current) onErrorRef.current(err);
      // Clean up stream and websocket
      for (const track of stream.getTracks()) {
        track.stop();
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    // Set recording state
    isRecordingRef.current = true;
    setIsRecording(true);
    if (onStartRef.current) {
      onStartRef.current();
    }

    // Start max duration timer
    maxDurationTimerRef.current = setTimeout(() => {
      if (isRecordingRef.current) {
        const err = createSTTError(
          "MAX_DURATION_REACHED",
          `Recording stopped after ${maxDurationSeconds}s limit`
        );
        setError(err);
        if (onErrorRef.current) onErrorRef.current(err);
        stopRecording();
      }
    }, maxDurationSeconds * 1000);
  }, [
    getToken,
    baseUrl,
    language,
    maxDurationSeconds,
    internalCleanup,
    stopRecording,
  ]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setSegments([]);
    transcriptRef.current = "";
    segmentsRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      internalCleanup();
    };
  }, [internalCleanup]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    transcript,
    segments,
    error,
    audioLevel,
    clearTranscript,
  };
}
