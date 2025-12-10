/**
 * Shared pipeline manager for transformers.js models.
 * Prevents loading the same model multiple times which causes ONNX runtime crashes.
 */

import type { DataType } from "@huggingface/transformers";

let sharedPipeline: any = null;
let currentModel: string | null = null;
let currentDevice: string | null = null;

export interface PipelineOptions {
  model: string;
  device?: "webgpu" | "wasm" | "cpu";
  dtype?: DataType;
}

/**
 * Get or create a text-generation pipeline.
 * If the same model is already loaded, reuses it.
 */
export async function getTextGenerationPipeline(
  options: PipelineOptions,
): Promise<any> {
  const { model, device = "wasm", dtype = "q4" } = options;

  // Reuse existing pipeline if same model and device
  if (sharedPipeline && currentModel === model && currentDevice === device) {
    return sharedPipeline;
  }

  const { pipeline, env } = await import("@huggingface/transformers");

  // Allow downloading from Hub
  env.allowLocalModels = false;

  // Suppress ONNX warnings
  if (env.backends?.onnx) {
    env.backends.onnx.logLevel = "fatal";
  }

  console.log(`[Pipeline] Loading model: ${model} on ${device}...`);

  sharedPipeline = await pipeline("text-generation", model, {
    dtype,
    device,
  });

  currentModel = model;
  currentDevice = device;

  console.log(`[Pipeline] Model loaded: ${model}`);

  return sharedPipeline;
}

/**
 * Clear the shared pipeline (useful for testing or switching models)
 */
export function clearPipeline(): void {
  sharedPipeline = null;
  currentModel = null;
  currentDevice = null;
}
