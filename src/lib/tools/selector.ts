import type { ClientTool, ToolSelectionResult } from "./types";
import { DEFAULT_LOCAL_CHAT_MODEL } from "../chat/constants";
import { getTextGenerationPipeline } from "../chat/pipeline";

// Use the same instruct model as local chat - it's proven to work
export const DEFAULT_TOOL_SELECTOR_MODEL = DEFAULT_LOCAL_CHAT_MODEL;

export interface ToolSelectorOptions {
  /** Model to use for tool selection. Defaults to the local chat model */
  model?: string;
  /** Temperature for generation (lower = more deterministic) */
  temperature?: number;
  /** Abort signal */
  signal?: AbortSignal;
  /** Device to use (webgpu, wasm, cpu). Defaults to wasm */
  device?: "webgpu" | "wasm" | "cpu";
}

/**
 * Build a prompt for the tool selection model
 */
function buildToolSelectionPrompt(
  userMessage: string,
  tools: ClientTool[]
): string {
  const toolDescriptions = tools
    .map((tool, index) => {
      const paramsDesc = tool.parameters
        ? tool.parameters
            .map(
              (p) =>
                `    - ${p.name} (${p.type}${
                  p.required ? ", required" : ""
                }): ${p.description}`
            )
            .join("\n")
        : "    (no parameters)";
      return `${index + 1}. ${tool.name}: ${
        tool.description
      }\n   Parameters:\n${paramsDesc}`;
    })
    .join("\n\n");

  return `You are a helpful assistant that selects the best tool for a user's request.
You have access to the following tools:

${toolDescriptions}

User Request: "${userMessage}"

Instructions:
1. select the most appropriate tool from the list.
2. If no tool is relevant, return null.
3. Respond ONLY with a valid JSON object. Do not add any explanation.

JSON Format:
{
  "tool": "tool_name",
  "params": {
    "param_name": "param_value"
  }
}

If no tool is needed:
{
  "tool": null
}

Response:`;
}

/**
 * Parse the model's response to extract tool selection
 */
function parseToolSelectionResponse(
  response: string,
  tools: ClientTool[]
): ToolSelectionResult {
  console.log("[Tool Selector] Raw response:", response);

  try {
    // Remove any markdown code blocks
    const cleanResponse = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Try to extract JSON object if it's embedded in text
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : cleanResponse;

    const parsed = JSON.parse(jsonStr);

    if (!parsed.tool || parsed.tool === "null" || parsed.tool === null) {
      console.log("[Tool Selector] No tool selected by model");
      return { toolSelected: false };
    }

    // Validate that the tool exists
    const toolExists = tools.some((t) => t.name === parsed.tool);
    if (!toolExists) {
      console.warn(
        `[Tool Selector] Model selected unknown tool: ${parsed.tool}`
      );
      return { toolSelected: false };
    }

    console.log(`[Tool Selector] Selected tool: ${parsed.tool}`, parsed.params);
    return {
      toolSelected: true,
      toolName: parsed.tool,
      parameters: parsed.params || {},
      confidence: 0.8,
    };
  } catch (error) {
    console.warn("[Tool Selector] Failed to parse JSON response:", error);

    // Fallback: Simple keyword matching if JSON parsing fails
    for (const tool of tools) {
      if (
        response.includes(`"tool": "${tool.name}"`) ||
        response.includes(`'tool': '${tool.name}'`)
      ) {
        console.log(
          `[Tool Selector] Fallback found tool name in text: ${tool.name}`
        );
        return {
          toolSelected: true,
          toolName: tool.name,
          parameters: {},
          confidence: 0.5,
        };
      }
    }

    return { toolSelected: false };
  }
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
    temperature = 0.1,
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
      dtype: "q4",
    });

    const prompt = buildToolSelectionPrompt(userMessage, tools);

    const output = await selectorPipeline(prompt, {
      max_new_tokens: 200,
      temperature,
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

    return parseToolSelectionResponse(generatedText, tools);
  } catch (error) {
    console.error("[Tool Selector] Error:", error);
    return { toolSelected: false };
  }
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
