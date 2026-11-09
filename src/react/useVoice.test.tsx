import { act, cleanup, renderHook } from "@testing-library/react";
import { StrictMode, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useVoice } from "./useVoice";

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  mimeType = "audio/webm;codecs=opus";
  state: RecordingState = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start = vi.fn(() => {
    this.state = "recording";
  });
  stop = vi.fn(() => {
    this.state = "inactive";
    queueMicrotask(() => this.onstop?.());
  });
}

function createStream() {
  const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
  const stream = { getTracks: () => tracks } as unknown as MediaStream;
  return { stream, tracks };
}

const getUserMedia = vi.fn<MediaDevices["getUserMedia"]>();
const recorderConstructor = vi.fn(function () {
  return new MockMediaRecorder();
});

beforeEach(() => {
  vi.clearAllMocks();
  getUserMedia.mockReset();
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia }, userAgent: "test" });
  vi.stubGlobal(
    "MediaRecorder",
    Object.assign(recorderConstructor, { isTypeSupported: MockMediaRecorder.isTypeSupported })
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useVoice recording lifecycle", () => {
  it("stops the recorder and all tracks on unmount", async () => {
    const { stream, tracks } = createStream();
    getUserMedia.mockResolvedValueOnce(stream);
    const { result, unmount } = renderHook(() => useVoice(), { wrapper: StrictMode });

    await act(() => result.current.startRecording());
    const recorder = recorderConstructor.mock.results[0].value as MockMediaRecorder;
    expect(result.current.isRecording).toBe(true);

    unmount();

    expect(recorder.stop).toHaveBeenCalledTimes(1);
    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalledTimes(1);
    }
  });

  it("releases a stream that arrives after unmount without a recorder", async () => {
    const { stream, tracks } = createStream();
    let resolveStream!: (stream: MediaStream) => void;
    getUserMedia.mockReturnValueOnce(
      new Promise<MediaStream>((resolve) => {
        resolveStream = resolve;
      })
    );
    const { result, unmount } = renderHook(() => useVoice());
    const start = result.current.startRecording();

    unmount();
    await act(async () => {
      resolveStream(stream);
      await start;
    });

    expect(recorderConstructor).not.toHaveBeenCalled();
    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalledTimes(1);
    }
  });

  it.each(["resolve", "reject"])(
    "preserves the active recorder when an old StrictMode request ends with %s",
    async (outcome) => {
      const old = createStream();
      const current = createStream();
      let resolveStream!: (stream: MediaStream) => void;
      let rejectStream!: (error: Error) => void;
      const starts: Promise<void>[] = [];
      getUserMedia
        .mockReturnValueOnce(
          new Promise<MediaStream>((resolve, reject) => {
            resolveStream = resolve;
            rejectStream = reject;
          })
        )
        .mockResolvedValueOnce(current.stream);
      const { result, unmount } = renderHook(
        () => {
          const voice = useVoice();
          const { startRecording } = voice;
          useEffect(() => {
            starts.push(startRecording());
          }, [startRecording]);
          return voice;
        },
        { wrapper: StrictMode }
      );
      await act(() => starts[1]);
      const recorder = recorderConstructor.mock.results[0].value as MockMediaRecorder;

      await act(async () => {
        if (outcome === "resolve") {
          resolveStream(old.stream);
          await starts[0];
        } else {
          const error = new Error("Microphone access denied");
          rejectStream(error);
          await expect(starts[0]).rejects.toBe(error);
        }
      });

      expect(recorderConstructor).toHaveBeenCalledTimes(1);
      expect(recorder.stop).not.toHaveBeenCalled();
      expect(result.current.isRecording).toBe(true);
      expect(result.current.error).toBeNull();
      for (const track of old.tracks) {
        expect(track.stop).toHaveBeenCalledTimes(outcome === "resolve" ? 1 : 0);
      }
      for (const track of current.tracks) {
        expect(track.stop).not.toHaveBeenCalled();
      }
      unmount();
      expect(recorder.stop).toHaveBeenCalledTimes(1);
      for (const track of current.tracks) {
        expect(track.stop).toHaveBeenCalledTimes(1);
      }
    }
  );

  it.each(["constructor", "start"])(
    "releases all tracks after a recorder %s error",
    async (step) => {
      const { stream, tracks } = createStream();
      const error = new Error("Recorder setup failed");
      getUserMedia.mockResolvedValueOnce(stream);
      if (step === "constructor") {
        recorderConstructor.mockImplementationOnce(function () {
          throw error;
        });
      } else {
        recorderConstructor.mockImplementationOnce(function () {
          const recorder = new MockMediaRecorder();
          recorder.start.mockImplementationOnce(() => {
            recorder.state = "recording";
            throw error;
          });
          return recorder;
        });
      }
      const { result, unmount } = renderHook(() => useVoice());

      await act(async () => {
        await expect(result.current.startRecording()).rejects.toBe(error);
      });

      expect(result.current.error).toBe(error);
      expect(result.current.isRecording).toBe(false);
      if (step === "start") {
        const recorder = recorderConstructor.mock.results[0].value as MockMediaRecorder;
        expect(recorder.stop).toHaveBeenCalledTimes(1);
      }
      for (const track of tracks) {
        expect(track.stop).toHaveBeenCalledTimes(1);
      }
      unmount();
      for (const track of tracks) {
        expect(track.stop).toHaveBeenCalledTimes(1);
      }
    }
  );

  it("returns the audio and releases the tracks after a normal stop", async () => {
    const { stream, tracks } = createStream();
    getUserMedia.mockResolvedValueOnce(stream);
    const { result, unmount } = renderHook(() => useVoice());
    await act(() => result.current.startRecording());
    const recorder = recorderConstructor.mock.results[0].value as MockMediaRecorder;
    recorder.ondataavailable?.({ data: new Blob(["audio"]) });

    await act(async () => {
      const recording = await result.current.stopRecording();
      expect(recording.blob.size).toBe(5);
      expect(recording.mimeType).toBe(recorder.mimeType);
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.recording?.blob.size).toBe(5);
    unmount();
    expect(recorder.stop).toHaveBeenCalledTimes(1);
    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalledTimes(1);
    }
  });

  it("releases the tracks when unmount precedes the stop event", async () => {
    const { stream, tracks } = createStream();
    getUserMedia.mockResolvedValueOnce(stream);
    const { result, unmount } = renderHook(() => useVoice());
    await act(() => result.current.startRecording());
    const recorder = recorderConstructor.mock.results[0].value as MockMediaRecorder;
    recorder.ondataavailable?.({ data: new Blob(["audio"]) });

    const stopped = result.current.stopRecording();
    unmount();
    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalledTimes(1);
    }
    await expect(stopped).resolves.toMatchObject({ mimeType: recorder.mimeType });
    expect(recorder.stop).toHaveBeenCalledTimes(1);
    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalledTimes(1);
    }
  });
});
