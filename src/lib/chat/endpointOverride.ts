/**
 * Shared validator for a caller-supplied per-call `endpointOverride`.
 *
 * Portal callers build the request URL as `baseUrl + endpoint`, so an
 * empty/whitespace override would target the portal root and a slash-less value
 * (`"api/v1/…"`) would concatenate into a broken URL — both silent bugs. A
 * protocol-relative (`"//host"`) or absolute (`"scheme://host"`) value would
 * redirect the request, and its Bearer token, off-origin.
 *
 * Returns the normalized root-relative path on success, or a descriptive
 * message the caller surfaces (never throws — a bad override is a validation
 * failure, not a crash). Shared by `runToolLoop` (chat) and the portal JSON
 * completion path (memory ops) so both enforce the exact same contract.
 */
export function validateEndpointOverride(
  override: string
): { valid: true; endpoint: string } | { valid: false; message: string } {
  const trimmed = override.trim();
  if (trimmed === "") {
    return {
      valid: false,
      message:
        'endpointOverride must be a non-empty, root-relative path (e.g. "/api/v1/utility/responses"); received an empty or whitespace-only string',
    };
  }
  if (trimmed.startsWith("//") || trimmed.includes("://")) {
    return {
      valid: false,
      message: `endpointOverride must be a root-relative path (e.g. "/api/v1/utility/responses"), not a protocol-relative or absolute URL; received "${trimmed}"`,
    };
  }
  return { valid: true, endpoint: trimmed.startsWith("/") ? trimmed : `/${trimmed}` };
}
