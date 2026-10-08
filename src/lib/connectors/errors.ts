/**
 * Canonical connector-error contract emitted by every connector tool factory.
 *
 * When the portal mint endpoint returns a 412 or 403, the tool factory does
 * NOT throw — it returns the JSON string produced by `buildConnectorErrorResult`
 * as the tool result. The post-loop parser in `@anuma/agent-runtime` walks the
 * resulting tool-role messages and lifts any payload bearing the
 * `__anuma_connector_error_v1` marker into a structured `ToolError[]` the
 * caller can render alongside the LLM reply.
 *
 * The double-underscore + version suffix in the marker name keeps it
 * collision-resistant against any tool that legitimately returns JSON
 * containing the word "error".
 */

/** Recognized connector error codes. */
export type ConnectorErrorCode =
  | "connector_not_connected"
  | "scope_not_covered"
  | "insufficient_scope"
  | "upstream_unavailable";

/** Marker key that distinguishes a connector error from any other tool JSON. */
export const CONNECTOR_ERROR_MARKER = "__anuma_connector_error_v1" as const;

interface ConnectorErrorPayload {
  __anuma_connector_error_v1: true;
  code: ConnectorErrorCode;
  provider: string;
  missing_scopes?: string[];
  required?: string;
}

interface ConnectorErrorExtras {
  missingScopes?: string[];
  required?: string;
}

/**
 * Build the canonical connector-error JSON string. Every connector tool
 * factory uses this helper so the marker convention is impossible to forget.
 *
 * Note: omitted optional fields are emitted as `undefined`, which
 * `JSON.stringify` drops, leaving the key absent — matching the shape the
 * post-loop parser expects.
 *
 * @param code       One of the recognized {@link ConnectorErrorCode} values.
 * @param provider   Logical provider name (`"gmail"`, `"gdrive"`, etc.).
 * @param extras     Optional `missingScopes` / `required` fields lifted by the
 *                   runtime parser into `ToolErrorInfo`.
 */
export function buildConnectorErrorResult(
  code: ConnectorErrorCode,
  provider: string,
  extras?: ConnectorErrorExtras
): string {
  const payload: ConnectorErrorPayload = {
    __anuma_connector_error_v1: true,
    code,
    provider,
    missing_scopes: extras?.missingScopes,
    required: extras?.required,
  };
  return JSON.stringify(payload);
}
