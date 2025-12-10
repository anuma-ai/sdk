import type { ClientTool, ToolSelectionResult } from "./types";
import { getTextGenerationPipeline } from "../chat/pipeline";

// Use Xenova/LaMini-GPT-124M - extremely fast (~124M params) and instruction tuned
export const DEFAULT_TOOL_SELECTOR_MODEL = "Xenova/LaMini-GPT-124M";

export interface ToolSelectorOptions {
  /** Model to use for tool selection. Defaults to Xenova/LaMini-GPT-124M */
  model?: string;
  /** Abort signal */
  signal?: AbortSignal;
  /** Device to use (webgpu, wasm, cpu). Defaults to wasm */
  device?: "webgpu" | "wasm" | "cpu";
}

/**
 * Build a minimal prompt for tool selection.
 * Tiny models can only handle simple tasks - just pick a tool name.
 */
function buildToolSelectionPrompt(
  userMessage: string,
  tools: ClientTool[],
): string {
  // Include tool name AND description for better matching
  const toolList = tools.map((t) => `${t.name} (${t.description})`).join("\n");

  // Simple prompt with descriptions
  return `Pick the best tool for the task. Reply with ONLY the tool name.

Available tools:
${toolList}
none (no tool needed)

Task: "${userMessage}"

Best tool:`;
}

/**
 * Build a prompt to extract a parameter value from user message.
 */
function buildParamExtractionPrompt(
  userMessage: string,
  paramName: string,
  paramDescription?: string,
): string {
  const desc = paramDescription ? ` (${paramDescription})` : "";
  return `Extract the value for "${paramName}"${desc} from the user message. Reply with ONLY the extracted value, nothing else.

User message: "${userMessage}"

Value for ${paramName}:`;
}

/**
 * Extract parameters from user message using the model.
 */
async function extractParams(
  userMessage: string,
  tool: ClientTool,
  options: { model: string; device: "webgpu" | "wasm" | "cpu" },
): Promise<Record<string, unknown>> {
  const params: Record<string, unknown> = {};

  if (!tool.parameters || tool.parameters.length === 0) return params;

  const { model, device } = options;

  try {
    const pipeline = await getTextGenerationPipeline({
      model,
      device,
      dtype: "q4",
    });

    // Extract each parameter using the model
    for (const param of tool.parameters) {
      const prompt = buildParamExtractionPrompt(
        userMessage,
        param.name,
        param.description,
      );

      const output = await pipeline(prompt, {
        max_new_tokens: 32, // Allow reasonable length for parameter values
        temperature: 0,
        do_sample: false,
        return_full_text: false,
      });

      const generatedText =
        output?.[0]?.generated_text || output?.generated_text || "";

      // Clean up the extracted value
      const extractedValue = generatedText.trim().split("\n")[0].trim();

      console.log(
        `[Tool Selector] Extracted param "${param.name}":`,
        extractedValue,
      );

      params[param.name] = extractedValue || userMessage;
    }
  } catch (error) {
    console.error("[Tool Selector] Error extracting params:", error);
    // Fallback: use user message for all params
    for (const param of tool.parameters) {
      params[param.name] = userMessage;
    }
  }

  return params;
}

/**
 * Parse the model's response to extract tool name.
 * Expects just the tool name, no JSON.
 */
async function parseToolSelectionResponse(
  response: string,
  tools: ClientTool[],
  userMessage: string,
  options: { model: string; device: "webgpu" | "wasm" | "cpu" },
): Promise<ToolSelectionResult> {
  console.log("[Tool Selector] Raw response:", response);

  // Clean up the response - just get the first word/token
  const cleaned = response
    .toLowerCase()
    .trim()
    .split(/[\s\n,.]+/)[0]
    .replace(/[^a-z0-9_-]/g, "");

  console.log("[Tool Selector] Parsed tool name:", cleaned);

  // Check if it matches "none" or similar
  if (cleaned === "none" || cleaned === "null" || cleaned === "") {
    console.log("[Tool Selector] No tool selected");
    return { toolSelected: false };
  }

  // Find the matching tool
  const selectedTool = tools.find((t) => t.name.toLowerCase() === cleaned);

  if (!selectedTool) {
    // Try fuzzy match - maybe partial match
    const fuzzyTool = tools.find(
      (t) =>
        t.name.toLowerCase().includes(cleaned) ||
        cleaned.includes(t.name.toLowerCase()),
    );

    if (fuzzyTool) {
      console.log(`[Tool Selector] Fuzzy matched tool: ${fuzzyTool.name}`);
      const params = await extractParams(userMessage, fuzzyTool, options);
      return {
        toolSelected: true,
        toolName: fuzzyTool.name,
        parameters: params,
        confidence: 0.6,
      };
    }

    console.warn(`[Tool Selector] Unknown tool: ${cleaned}`);
    return { toolSelected: false };
  }

  // Extract parameters using the model
  const params = await extractParams(userMessage, selectedTool, options);

  console.log(`[Tool Selector] Selected tool: ${selectedTool.name}`, params);
  return {
    toolSelected: true,
    toolName: selectedTool.name,
    parameters: params,
    confidence: 0.9,
  };
}

/**
 * Select a tool based on user message using an in-browser model
 */
export async function selectTool(
  userMessage: string,
  tools: ClientTool[],
  options: ToolSelectorOptions = {},
): Promise<ToolSelectionResult> {
  const {
    model = DEFAULT_TOOL_SELECTOR_MODEL,
    signal,
    device = "wasm",
  } = options;

  if (!tools.length) {
    return { toolSelected: false };
  }

  console.log(
    `[Tool Selector] analyzing message: "${userMessage}" with model ${model}`,
  );

  try {
    // Use shared pipeline to avoid loading same model twice
    const selectorPipeline = await getTextGenerationPipeline({
      model,
      device,
      dtype: "q4", // Aggressive quantization for speed
    });

    const prompt = buildToolSelectionPrompt(userMessage, tools);

    const output = await selectorPipeline(prompt, {
      max_new_tokens: 4, // Just need the tool name
      temperature: 0, // Deterministic
      do_sample: false,
      return_full_text: false,
    });

    // Check for abort
    if (signal?.aborted) {
      return { toolSelected: false };
    }

    // Extract generated text
    const generatedText =
      output?.[0]?.generated_text || output?.generated_text || "";

    return await parseToolSelectionResponse(generatedText, tools, userMessage, {
      model,
      device,
    });
  } catch (error) {
    console.error("[Tool Selector] Error:", error);
    return { toolSelected: false };
  }
}

// Track preload state at module level to survive React StrictMode remounts
// Key by model name to support different models
const preloadState: Map<
  string,
  { promise: Promise<void>; attempted: boolean }
> = new Map();

/**
 * Preload the tool selector model.
 * Call this early to avoid latency on first tool selection.
 * Safe to call multiple times - will only load once per model.
 */
export async function preloadToolSelectorModel(
  options: Omit<ToolSelectorOptions, "signal"> = {},
): Promise<void> {
  const { model = DEFAULT_TOOL_SELECTOR_MODEL, device = "wasm" } = options;

  // Return existing promise if already loading/loaded/attempted
  const existing = preloadState.get(model);
  if (existing) {
    return existing.promise;
  }

  console.log(`[Tool Selector] Preloading model: ${model}`);

  const promise = getTextGenerationPipeline({
    model,
    device,
    dtype: "q4",
  })
    .then(() => {
      console.log(`[Tool Selector] Model preloaded: ${model}`);
    })
    .catch((error) => {
      console.warn("[Tool Selector] Failed to preload model:", error);
      // Don't reset - avoid spamming retries on every render
    });

  preloadState.set(model, { promise, attempted: true });

  return promise;
}

/**
 * Execute a client-side tool with the given parameters
 */
export async function executeTool(
  tool: ClientTool,
  params: Record<string, unknown>,
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  try {
    console.log(
      `[Tool Selector] Executing tool ${tool.name} with params:`,
      params,
    );
    const result = await tool.execute(params);
    console.log(`[Tool Selector] Tool ${tool.name} execution result:`, result);
    return { success: true, result };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Tool execution failed";
    console.error(`[Tool Selector] Tool ${tool.name} failed:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}
