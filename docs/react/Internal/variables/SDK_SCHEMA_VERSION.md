# SDK\_SCHEMA\_VERSION

> `const` **SDK\_SCHEMA\_VERSION**: `32` = `32`

Defined in: [src/lib/db/schema.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/schema.ts#58)

Current combined schema version for all SDK storage modules.

Version history:

* v2: Baseline (chat + memory tables) - minimum supported version for migrations
* v3: Added was\_stopped column to history table
* v4: Added modelPreferences table for settings storage
* v5: Added error column to history table for error persistence
* v6: Added thought\_process column to history table for activity tracking
* v7: Added userPreferences table for unified user settings storage
* v8: BREAKING - Clear all data (switching embedding model from OpenAI to Fireworks)
* v9: Added thinking column to history table for reasoning/thinking content
* v10: Added projects table and project\_id column to conversations table
* v11: Added media table for library feature, added file\_ids column to history table
* v12: Added chunks column to history table for sub-message semantic search
* v13: Added parent\_message\_id column to history table for message branching (edit/regenerate)
* v14: Added feedback column to history table for like/dislike on responses
* v15: Replaced memories table with memory\_vault table for persistent memory vault
* v16: Added scope column to memory\_vault table for memory partitioning
* v17: Added image\_model column to history table for AI-generated image model tracking
* v18: Added vault\_folders table and folder\_id column to memory\_vault for folder organization
* v19: Added user\_id column to memory\_vault for multi-user server-side scoping
* v20: Added index on updated\_at column of memory\_vault for efficient since-based filtering
* v21: Added embedding column to memory\_vault for persisted embedding vectors
* v22: Added is\_system column to vault\_folders for default system folders
* v23: Added conversation\_summaries table for progressive history summarization
* v24: Added context column to vault\_folders for LLM-generated folder summaries
* v25: Added saved\_tools table for user-saved display apps exposed as LLM tools
* v26: Added app\_files table for LLM-generated app source files (HTML/CSS/JS)
* v27: Added tool\_call\_events column to history for reconstructing tool call history
* v28: Added source\_chunk\_ids, proof\_count, source columns to memory\_vault for auto-extraction provenance and supersession tracking
* v29: Added entity + memory\_entity tables for the W5 knowledge-graph retrieval lane
* v30: Added event\_time\_start, event\_time\_end, event\_time\_kind columns to memory\_vault for the W6 temporal retrieval lane
* v31: Added user\_id column to memory\_entity for multi-user server-side scoping of the W5 graph retrieval lane
* v32: Added pinned\_at column to conversations for pinning chats to the top of the list
