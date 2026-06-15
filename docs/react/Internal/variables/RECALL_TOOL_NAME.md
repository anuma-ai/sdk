# RECALL\_TOOL\_NAME

> `const` **RECALL\_TOOL\_NAME**: `"recall_memory"` = `"recall_memory"`

Defined in: [src/lib/memory/recallTool.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#24)

Tool name surfaced to the LLM. Exported so bench harnesses and chat
clients reference the same string — drift between prod and bench would
mask tool-routing bugs in eval.
