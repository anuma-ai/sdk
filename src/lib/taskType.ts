/**
 * Class-B task types — the vocabulary of the `X-Anuma-Task-Type` header.
 *
 * A Class-B flow has ONE fixed purpose and no conversation: extract memories
 * from a snippet, pick a topic, consolidate duplicates, classify a query. Today
 * each of those builds its own system prompt on the client and sends it as a
 * `role:system` message, which makes the prompt a suggestion rather than a
 * contract — a caller can reword it into "you are a general assistant" and get
 * general chat at internal-endpoint prices.
 *
 * The fix is that the SERVER owns the text and the client only names the task.
 * This header is the name. The portal allowlists it against its own copy of this
 * enum (ai-portal `internal/systemprompt/tasks.go`) and DROPS anything it does
 * not recognise, so an unknown value degrades to "no task declared" rather than
 * failing the request.
 *
 * ⚠ These string values are a wire contract with ai-portal. Adding one here
 * before the portal knows it is harmless (it is dropped); renaming or removing
 * one silently stops that flow being counted. Keep them in step with
 * `AllTaskTypes` on the portal side, and see ai-portal
 * `docs/BACKEND_OWNED_TASK_PROMPTS.md` for the rollout.
 *
 * Deliberately ABSENT: agent personas, `reflect()` when it answers the user, and
 * the app-idea chat. Those carry an open conversation with the user, so a fixed
 * server-owned prompt would be wrong rather than merely premature — the same
 * boundary {@link INTERNAL_FLOW_MARKER} draws.
 *
 * @public
 */
export type TaskType =
  | "title"
  | "commit_message"
  | "memory_extract"
  | "memory_dedup"
  | "memory_decay"
  | "memory_injection_check"
  | "memory_verify_support"
  | "memory_autosort"
  | "memory_topic"
  | "memory_consolidate"
  | "memory_decompose"
  | "memory_profile_synth"
  | "memory_graph"
  | "folder_context"
  | "selection_memory"
  | "summarize"
  | "style_analysis"
  | "classify_search"
  | "app_inspiration"
  | "spotlight_image"
  | "slide_image"
  | "media_video"
  | "media_audio"
  | "media_bg_removal"
  | "media_image_preset"
  | "tool_app_builder"
  | "tool_document_builder"
  | "tool_slides"
  | "connector_guidance"
  | "cf_task"
  | "xbot_intent"
  | "xbot_council"
  | "scheduled_task";

/**
 * HTTP header naming the Class-B task a request performs.
 *
 * @public
 */
export const TASK_TYPE_HEADER = "X-Anuma-Task-Type";

/**
 * Build the task-type header, or nothing when no task is declared.
 *
 * Returns a spreadable object so call sites stay a single expression
 * (`{ ...auth, ...taskTypeHeader(t) }`) and an undeclared task adds no header at
 * all rather than an empty one — the portal treats absent and invalid
 * identically, but an empty header value is noise on the wire and in logs.
 *
 * @public
 */
export function taskTypeHeader(taskType?: TaskType): Record<string, string> {
  return taskType ? { [TASK_TYPE_HEADER]: taskType } : {};
}
