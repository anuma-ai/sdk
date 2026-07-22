# RECALL\_TOOL\_NAME

> `const` **RECALL\_TOOL\_NAME**: `"recall_memory"` = `"recall_memory"`

Defined in: [src/lib/memory/recallConstants.ts:14](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallConstants.ts#14)

Tool name surfaced to the LLM. Exported so bench harnesses and chat
clients reference the same string — drift between prod and bench would
mask tool-routing bugs in eval.
