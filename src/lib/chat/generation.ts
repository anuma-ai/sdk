import { DEFAULT_LOCAL_CHAT_MODEL } from "./constants";
import { getTextGenerationPipeline } from "./pipeline";

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

  const { TextStreamer } = await import("@huggingface/transformers");

  // Use shared pipeline to avoid loading same model twice
  const chatPipeline = await getTextGenerationPipeline({
    model,
    device: "wasm",
    dtype: "q4",
  });

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

  return output;
}
