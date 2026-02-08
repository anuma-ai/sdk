import type { STTError, STTErrorCode } from "./types";

export function createSTTError(
  code: STTErrorCode,
  message: string,
  cause?: Error
): STTError {
  return { code, message, cause };
}

export async function requestMicrophoneAccess(): Promise<MediaStream> {
  if (
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== "function"
  ) {
    throw createSTTError(
      "BROWSER_NOT_SUPPORTED",
      "Browser does not support getUserMedia"
    );
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: { ideal: 16000 },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err) {
    if (err instanceof DOMException) {
      if (err.name === "NotAllowedError") {
        throw createSTTError(
          "PERMISSION_DENIED",
          "Microphone access was denied",
          err
        );
      }
      if (err.name === "NotFoundError") {
        throw createSTTError(
          "MICROPHONE_NOT_FOUND",
          "No microphone found",
          err
        );
      }
    }
    throw createSTTError(
      "BROWSER_NOT_SUPPORTED",
      "Failed to access microphone",
      err instanceof Error ? err : new Error(String(err))
    );
  }
}

export function resample(
  input: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number
): Float32Array {
  if (sourceSampleRate === targetSampleRate) {
    return input;
  }
  const ratio = sourceSampleRate / targetSampleRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcFloor = Math.floor(srcIndex);
    const srcCeil = Math.min(srcFloor + 1, input.length - 1);
    const frac = srcIndex - srcFloor;
    output[i] = input[srcFloor] * (1 - frac) + input[srcCeil] * frac;
  }
  return output;
}

export function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return int16;
}

type AudioPipelineCallbacks = {
  onChunk: (pcmBuffer: ArrayBuffer) => void;
  onLevel: (level: number) => void;
};

export function createAudioPipeline(targetSampleRate: number) {
  return {
    start(
      stream: MediaStream,
      onChunk: AudioPipelineCallbacks["onChunk"],
      onLevel: AudioPipelineCallbacks["onLevel"],
      chunkIntervalMs: number
    ): () => void {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      // ScriptProcessorNode with buffer size 4096
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioContext.destination);

      let pcmBuffer: Int16Array[] = [];
      const nativeSampleRate = audioContext.sampleRate;

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const resampled = resample(inputData, nativeSampleRate, targetSampleRate);
        const int16 = float32ToInt16(resampled);
        pcmBuffer.push(int16);
      };

      // Flush buffer at chunkIntervalMs
      const flushInterval = setInterval(() => {
        if (pcmBuffer.length === 0) return;
        const chunks = pcmBuffer;
        pcmBuffer = [];
        // Merge all chunks
        let totalLength = 0;
        for (const chunk of chunks) {
          totalLength += chunk.length;
        }
        const merged = new Int16Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        onChunk(merged.buffer);
      }, chunkIntervalMs);

      // Audio level monitoring via requestAnimationFrame
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      let animFrameId: number;

      const updateLevel = () => {
        analyser.getByteFrequencyData(frequencyData);
        // RMS of frequency data, normalized to 0-1
        let sum = 0;
        for (let i = 0; i < frequencyData.length; i++) {
          const normalized = frequencyData[i] / 255;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / frequencyData.length);
        onLevel(rms);
        animFrameId = requestAnimationFrame(updateLevel);
      };
      animFrameId = requestAnimationFrame(updateLevel);

      // Return cleanup function
      return () => {
        clearInterval(flushInterval);
        cancelAnimationFrame(animFrameId);
        processor.disconnect();
        analyser.disconnect();
        source.disconnect();
        audioContext.close();
        for (const track of stream.getTracks()) {
          track.stop();
        }
      };
    },
  };
}
