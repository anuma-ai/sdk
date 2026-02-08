/**
 * Audio utilities for speech-to-text processing.
 * Handles decoding MediaRecorder output to the format Whisper expects (16kHz mono Float32Array).
 */

/**
 * Decode a MediaRecorder Blob into a 16kHz mono Float32Array suitable for Whisper.
 * Uses OfflineAudioContext to resample to the target sample rate.
 */
export async function decodeAudioBlob(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const targetSampleRate = 16000;
    const targetLength = Math.ceil(audioBuffer.duration * targetSampleRate);
    const offlineCtx = new OfflineAudioContext(
      1,
      targetLength,
      targetSampleRate
    );
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    const resampled = await offlineCtx.startRendering();
    return resampled.getChannelData(0);
  } finally {
    await audioContext.close();
  }
}

/**
 * Pick the best MIME type supported by MediaRecorder in the current browser.
 * Returns an empty string if no supported type is found.
 */
export function getSupportedMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
  ];
  for (const mime of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(mime)
    ) {
      return mime;
    }
  }
  return "";
}
