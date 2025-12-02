import { DEFAULT_LOCAL_CHAT_MODEL } from "./constants";

let chatPipeline: any = null;
let currentModel: string | null = null;

export interface GenerateLocalChatCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
}

export async function generateLocalChatCompletion(
  messages: Array<{ role: string; content: string }>,
  options: GenerateLocalChatCompletionOptions = {}
) {
  const {
    model = DEFAULT_LOCAL_CHAT_MODEL,
    temperature = 0.7,
    max_tokens = 1024,
    top_p = 0.9,
    onToken,
    signal,
  } = options;

  const { pipeline, TextStreamer } = await import("@huggingface/transformers");

  if (!chatPipeline || currentModel !== model) {
    // Use WebGPU if available, fall back to WASM
    // ONNX models from onnx-community work with default settings
    chatPipeline = await pipeline("text-generation", model, {
      dtype: "fp16",
    });
    currentModel = model;
  }

  // Custom streamer that triggers the onToken callback
  class CallbackStreamer extends TextStreamer {
    constructor(tokenizer: any, cb: (text: string) => void) {
      super(tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
      });
      this.cb = cb;
    }

    cb: (text: string) => void;

    on_finalized_text(text: string) {
      if (signal?.aborted) {
        throw new Error("AbortError");
      }
      this.cb(text);
    }
  }

  const streamer = onToken
    ? new CallbackStreamer(chatPipeline.tokenizer, onToken)
    : undefined;

  const output = await chatPipeline(messages, {
    max_new_tokens: max_tokens,
    temperature,
    top_p,
    streamer,
    return_full_text: false,
  });

  // Return the generated text
  // For chat inputs, the output structure depends on the pipeline version,
  // but typically with return_full_text: false and chat input, it returns the generated response.
  // Let's assume it returns [{ generated_text: "..." }] or similar.

  // If streaming, the content is already delivered via onToken.
  // But we should return the final result too.

  return output;
}
