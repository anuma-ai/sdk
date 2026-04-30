/**
 * xAI (Grok) hybrid tool-call format handling.
 *
 * Grok models occasionally emit tool calls as an XML wrapper in the assistant
 * message/text content rather than fully populating OpenAI-style tool_calls:
 *
 *   <xai:function_call name="create_file">
 *     <parameter name="path">slides.json</parameter>
 *     <parameter name="content">{...}</parameter>
 *   </xai:function_call>
 *
 * The portal extracts *some* parameters into OpenAI-shape `tool_calls` (often
 * just the short ones like `path`) and leaves the rest as XML text in the
 * content stream. Result: `tool_calls[].function.arguments` is partial
 * (`{"path":"..."}`) while the full args live in content. The client then
 * sees a tool invocation missing required fields.
 *
 * This module parses those XML `<parameter>` blocks and merges them into
 * the corresponding tool call's JSON arguments, then strips the XML from
 * the visible content so downstream consumers don't see raw wrappers.
 *
 * No-op when the content doesn't contain `<parameter name=` — so non-xAI
 * providers are unaffected.
 */

import type { AccumulatedToolCall } from "../types";

const PARAM_RE = /<parameter name="([^"]+)">([\s\S]*?)<\/parameter>/g;
const XAI_WRAPPER_RE = /<\/?xai:function_call[^>]*>/g;
const INVOKE_RE = /<\/?invoke[^>]*>/g;
const PARAM_MARKER = "<parameter name=";

function extractParamGroups(content: string): Array<Record<string, string>> {
  // One group per `<xai:function_call>` segment so multi-call turns pair
  // correctly. Segments without a <parameter> are ignored (plain prose).
  const segments = content.split(/<\/xai:function_call>/);
  const groups: Array<Record<string, string>> = [];
  for (const seg of segments) {
    if (!seg.includes(PARAM_MARKER)) continue;
    const params: Record<string, string> = {};
    const re = new RegExp(PARAM_RE.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(seg)) !== null) {
      const [, name, raw] = m;
      if (name) params[name] = raw ?? "";
    }
    if (Object.keys(params).length > 0) groups.push(params);
  }
  return groups;
}

/**
 * Merge xAI-style `<parameter>` blocks from `content` into the arguments of
 * tool calls in `toolCalls`, pairing by position. Mutates tool call entries
 * in place. Returns `content` with the recognized XML (and any
 * `<xai:function_call>` / `<invoke>` wrappers) stripped.
 */
export function mergeXaiInlineParameterTags(
  content: string,
  toolCalls: Map<string, AccumulatedToolCall>
): string {
  if (!content || !content.includes(PARAM_MARKER)) return content;

  const entries = Array.from(toolCalls.values());
  if (entries.length === 0) return content;

  const groups = extractParamGroups(content);
  if (groups.length === 0) return content;

  const pairCount = Math.min(groups.length, entries.length);
  for (let i = 0; i < pairCount; i++) {
    const target = entries[i];
    const params = groups[i];
    if (!target || !params) continue;
    let args: Record<string, unknown> = {};
    if (target.arguments) {
      try {
        const parsed = JSON.parse(target.arguments) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          args = parsed as Record<string, unknown>;
        }
      } catch {
        args = {};
      }
    }
    for (const [k, v] of Object.entries(params)) {
      if (args[k] === undefined) args[k] = v;
    }
    target.arguments = JSON.stringify(args);
  }

  return content.replace(PARAM_RE, "").replace(XAI_WRAPPER_RE, "").replace(INVOKE_RE, "").trim();
}
