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
  tools: ClientTool[]
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
 * Extract parameters heuristically from user message based on tool schema.
 * Since tiny models can't reliably extract params, we do it ourselves.
 */
function extractParams(
  userMessage: string,
  tool: ClientTool
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  if (!tool.parameters) return params;

  for (const param of tool.parameters) {
    // Simple heuristics based on common param types
    if (param.name === "expression" || param.name === "query") {
      // For math/search, the whole message is likely the expression
      params[param.name] = userMessage;
    } else if (param.name === "location" || param.name === "city") {
      // For location-based tools, try to extract a location
      // Simple heuristic: use the whole message if it's short, or look for capitalized words
      const words = userMessage.split(/\s+/);
      const capitalizedWords = words.filter(
        (w) => w.length > 1 && w[0] === w[0].toUpperCase()
      );
      params[param.name] =
        capitalizedWords.length > 0 ? capitalizedWords.join(" ") : userMessage;
    } else if (param.name === "text" || param.name === "input") {
      params[param.name] = userMessage;
    } else {
      // Default: pass the user message
      params[param.name] = userMessage;
    }
  }

  return params;
}

/**
 * Parse the model's response to extract tool name.
 * Expects just the tool name, no JSON.
 */
function parseToolSelectionResponse(
  response: string,
  tools: ClientTool[],
  userMessage: string
): ToolSelectionResult {
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
        cleaned.includes(t.name.toLowerCase())
    );

    if (fuzzyTool) {
      console.log(`[Tool Selector] Fuzzy matched tool: ${fuzzyTool.name}`);
      const params = extractParams(userMessage, fuzzyTool);
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

  // Extract parameters heuristically
  const params = extractParams(userMessage, selectedTool);

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
  options: ToolSelectorOptions = {}
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
    `[Tool Selector] analyzing message: "${userMessage}" with model ${model}`
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

    return parseToolSelectionResponse(generatedText, tools, userMessage);
  } catch (error) {
    console.error("[Tool Selector] Error:", error);
    return { toolSelected: false };
  }
}

// Track preload state at module level to survive React StrictMode remounts
let preloadPromise: Promise<void> | null = null;

/**
 * Preload the tool selector model.
 * Call this early to avoid latency on first tool selection.
 * Safe to call multiple times - will only load once.
 */
export async function preloadToolSelectorModel(
  options: Omit<ToolSelectorOptions, "signal"> = {}
): Promise<void> {
  // Return existing promise if already loading/loaded
  if (preloadPromise) {
    return preloadPromise;
  }

  const { model = DEFAULT_TOOL_SELECTOR_MODEL, device = "wasm" } = options;

  console.log(`[Tool Selector] Preloading model: ${model}`);

  preloadPromise = getTextGenerationPipeline({
    model,
    device,
    dtype: "q4",
  })
    .then(() => {
      console.log(`[Tool Selector] Model preloaded: ${model}`);
    })
    .catch((error) => {
      console.warn("[Tool Selector] Failed to preload model:", error);
      // Reset so it can be retried
      preloadPromise = null;
    });

  return preloadPromise;
}

/**
 * Execute a client-side tool with the given parameters
 */
export async function executeTool(
  tool: ClientTool,
  params: Record<string, unknown>
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  try {
    console.log(
      `[Tool Selector] Executing tool ${tool.name} with params:`,
      params
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
