/**
 * Parameter definition for a client-side tool
 */
export interface ToolParameter {
  /** Parameter name */
  name: string;
  /** Parameter type (string, number, boolean, etc.) */
  type: "string" | "number" | "boolean" | "object" | "array";
  /** Human-readable description of the parameter */
  description: string;
  /** Whether this parameter is required */
  required?: boolean;
  /** Default value if not provided */
  default?: unknown;
}

/**
 * Definition for a client-side tool that can be executed in the browser
 */
export interface ClientTool {
  /** Unique identifier for the tool */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** Parameters the tool accepts */
  parameters?: ToolParameter[];
  /**
   * The function to execute when the tool is called.
   * Receives extracted parameters and returns a result.
   */
  execute: (params: Record<string, unknown>) => Promise<unknown> | unknown;
}

/**
 * Result of a tool selection operation
 */
export interface ToolSelectionResult {
  /** Whether a tool was selected */
  toolSelected: boolean;
  /** Name of the selected tool (if any) */
  toolName?: string;
  /** Extracted parameters for the tool */
  parameters?: Record<string, unknown>;
  /** Confidence score (0-1) of the selection */
  confidence?: number;
}

/**
 * Result of executing a client-side tool
 */
export interface ToolExecutionResult {
  /** Name of the tool that was executed */
  toolName: string;
  /** Whether execution was successful */
  success: boolean;
  /** The result returned by the tool */
  result?: unknown;
  /** Error message if execution failed */
  error?: string;
}
