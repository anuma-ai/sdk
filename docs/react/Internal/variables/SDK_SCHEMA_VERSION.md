# SDK\_SCHEMA\_VERSION

> `const` **SDK\_SCHEMA\_VERSION**: `13` = `13`

Defined in: [src/lib/db/schema.ts:34](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/schema.ts#L34)

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
