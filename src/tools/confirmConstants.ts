/**
 * Confirm tool constants — deliberately dependency-free.
 *
 * Split out of `confirm.ts` so the tool NAME can be referenced from
 * node/React-Native-safe modules (e.g. the client-tool selector in
 * `../lib/tools/clientToolSelection`) without depending on what `confirm.ts`
 * and `uiInteraction.ts` import. Keep this file import-free.
 */

/** Tool name surfaced to the LLM. */
export const CONFIRM_TOOL_NAME = "prompt_user_confirm";
