import type {
  LlmapiMessage,
  LlmapiMessageContentPart,
  LlmapiTool,
  LlmapiToolFunction,
} from "../../../../client";

/**
 * Chat Completions API Format Transformers
 *
 * These transformers convert from OpenAI Responses API format to Chat Completions API format.
 * This is necessary because:
 * 1. The frontend sends requests in Responses API format
 * 2. Fireworks and other providers expect Chat Completions API format
 * 3. The SDK receives an apiType parameter to determine which format to use
 *
 * Transformations performed:
 * 1. Message content: Array of content parts → String
 * 2. Built-in tools: Shorthand format → Full function definitions
 * 3. Function schema: "arguments" → "parameters"
 */

/**
 * Built-in tool schemas for expanding shorthand tool definitions
 */
const BUILTIN_TOOL_SCHEMAS: Record<string, LlmapiToolFunction> = {
  web_search: {
    name: "web_search",
    description: "Search the web for real-time information.",
    arguments: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query.",
        },
      },
      required: ["query"],
    },
  },
  code_interpreter: {
    name: "code_interpreter",
    description: "Execute code in a sandboxed environment.",
    arguments: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "The code to execute.",
        },
        language: {
          type: "string",
          description: "The programming language (e.g., python, javascript).",
        },
      },
      required: ["code"],
    },
  },
  file_search: {
    name: "file_search",
    description: "Search through uploaded files.",
    arguments: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to find relevant content in files.",
        },
      },
      required: ["query"],
    },
  },
};

/**
 * Transforms message content from array format to string format.
 *
 * From (Responses API):
 * { content: [{ type: "text", text: "Hello world" }] }
 *
 * To (Chat Completions):
 * { content: "Hello world" }
 *
 * @param content - The content to transform (string or array of content parts)
 * @returns The transformed content as a string
 */
export function transformMessageContent(
  content: string | LlmapiMessageContentPart[] | undefined
): string {
  if (content === undefined || content === null) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  // Extract text from all text parts and concatenate
  return content
    .filter(
      (part): part is LlmapiMessageContentPart & { text: string } =>
        part.type === "text" && typeof part.text === "string"
    )
    .map((part) => part.text)
    .join("");
}

/**
 * Checks if a content array contains non-text parts (images, files)
 * that should be preserved for multimodal models.
 */
export function hasMultimodalContent(
  content: string | LlmapiMessageContentPart[] | undefined
): boolean {
  if (!content || typeof content === "string") {
    return false;
  }

  return content.some(
    (part) => part.type === "image_url" || part.type === "input_image" || part.type === "input_file"
  );
}

/**
 * Transforms a single message for Chat Completions API.
 * Converts content from array to string format.
 *
 * @param message - The message to transform
 * @returns The transformed message with string content
 */
export function transformMessage(message: LlmapiMessage): Record<string, unknown> {
  const transformed: Record<string, unknown> = {
    role: message.role,
  };

  // Transform content from array to string (unless it has multimodal content)
  if (message.content !== undefined) {
    if (hasMultimodalContent(message.content)) {
      // Keep array format for multimodal content
      transformed.content = message.content;
    } else {
      // Convert to string for text-only content
      transformed.content = transformMessageContent(message.content);
    }
  }

  // Preserve tool_call_id for tool role messages
  if (message.tool_call_id) {
    transformed.tool_call_id = message.tool_call_id;
  }

  // Preserve tool_calls for assistant role messages
  if (message.tool_calls) {
    transformed.tool_calls = message.tool_calls;
  }

  return transformed;
}

/**
 * Transforms all messages for Chat Completions API.
 *
 * @param messages - Array of messages to transform
 * @returns Array of transformed messages with string content
 */
export function transformMessages(
  messages: LlmapiMessage[]
): Record<string, unknown>[] {
  return messages.map(transformMessage);
}

/**
 * Transforms a function schema from "arguments" to "parameters".
 *
 * From (Responses API):
 * { name: "my_func", arguments: { type: "object", ... } }
 *
 * To (Chat Completions):
 * { name: "my_func", parameters: { type: "object", ... } }
 */
export function transformFunctionSchema(
  fn: LlmapiToolFunction
): Record<string, unknown> {
  const { arguments: args, ...rest } = fn;

  // If "arguments" exists and "parameters" doesn't, rename it
  if (args !== undefined) {
    return {
      ...rest,
      parameters: args,
    };
  }

  return fn as Record<string, unknown>;
}

/**
 * Transforms a single tool for Chat Completions API.
 *
 * Handles:
 * 1. Built-in tools (web_search, code_interpreter, file_search) - expands to full function definitions
 * 2. Function tools with "arguments" - renames to "parameters"
 *
 * @param tool - The tool to transform
 * @returns The transformed tool in Chat Completions format
 */
export function transformTool(tool: LlmapiTool): Record<string, unknown> {
  // Check if this is a built-in tool shorthand (type is the tool name, not "function")
  if (tool.type && tool.type !== "function" && BUILTIN_TOOL_SCHEMAS[tool.type]) {
    const builtinSchema = BUILTIN_TOOL_SCHEMAS[tool.type];
    return {
      type: "function",
      function: transformFunctionSchema(builtinSchema),
    };
  }

  // Handle regular function tools
  if (tool.type === "function" && tool.function) {
    return {
      type: "function",
      function: transformFunctionSchema(tool.function),
    };
  }

  // Pass through unknown tool types unchanged
  return tool as Record<string, unknown>;
}

/**
 * Transforms all tools for Chat Completions API.
 *
 * @param tools - Array of tools to transform
 * @returns Array of transformed tools in Chat Completions format
 */
export function transformTools(
  tools: LlmapiTool[] | undefined
): Record<string, unknown>[] | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  return tools.map(transformTool);
}

/**
 * Transforms a complete request body from Responses API format to Chat Completions API format.
 *
 * @param params - The request parameters
 * @returns The transformed request body for Chat Completions API
 */
export function transformToCompletionsFormat(params: {
  messages: LlmapiMessage[];
  model: string;
  stream: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  tools?: LlmapiTool[];
  toolChoice?: string;
}): Record<string, unknown> {
  const {
    messages,
    model,
    stream,
    temperature,
    maxOutputTokens,
    tools,
    toolChoice,
  } = params;

  return {
    messages: transformMessages(messages),
    model,
    stream,
    ...(temperature !== undefined && { temperature }),
    ...(maxOutputTokens !== undefined && { max_tokens: maxOutputTokens }),
    ...(tools && { tools: transformTools(tools) }),
    ...(toolChoice && { tool_choice: toolChoice }),
  };
}
