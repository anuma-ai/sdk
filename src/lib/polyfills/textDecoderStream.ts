/**
 * TextDecoderStream polyfill for React Native compatibility.
 *
 * React Native doesn't have TextDecoderStream, but it does have TextDecoder.
 * This polyfill creates a TransformStream that uses TextDecoder internally.
 */

// Check if we're in an environment that needs the polyfill
const needsPolyfill = typeof globalThis.TextDecoderStream === "undefined";

if (needsPolyfill && typeof globalThis.TransformStream !== "undefined") {
  class TextDecoderStreamPolyfill {
    private decoder: TextDecoder;
    private transform: TransformStream<Uint8Array, string>;

    constructor(label = "utf-8", options?: TextDecoderOptions) {
      this.decoder = new TextDecoder(label, options);

      const decoder = this.decoder;
      this.transform = new TransformStream<Uint8Array, string>({
        transform(chunk, controller) {
          const text = decoder.decode(chunk, { stream: true });
          if (text) {
            controller.enqueue(text);
          }
        },
        flush(controller) {
          const text = decoder.decode();
          if (text) {
            controller.enqueue(text);
          }
        },
      });
    }

    get readable(): ReadableStream<string> {
      return this.transform.readable;
    }

    get writable(): WritableStream<Uint8Array> {
      return this.transform.writable;
    }
  }

  // @ts-expect-error - Adding polyfill to globalThis
  globalThis.TextDecoderStream = TextDecoderStreamPolyfill;
}

export { needsPolyfill };
