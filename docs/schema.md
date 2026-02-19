# Database Schema

Current version: **v15**

## Tables

- [`history`](#history)
- [`conversations`](#conversations)
- [`projects`](#projects)
- [`memories`](#memories)
- [`modelPreferences`](#modelpreferences)
- [`userPreferences`](#userpreferences)
- [`display_interactions`](#display-interactions)
- [`media`](#media)

## `history`

| Column | Type | Indexed | Optional |
|--------|------|---------|----------|
| `message_id` | number |  |  |
| `conversation_id` | string | ✓ |  |
| `role` | string | ✓ |  |
| `content` | string |  |  |
| `model` | string |  | ✓ |
| `files` | string |  | ✓ |
| `file_ids` | string |  | ✓ |
| `created_at` | number | ✓ |  |
| `updated_at` | number |  |  |
| `vector` | string |  | ✓ |
| `embedding_model` | string |  | ✓ |
| `chunks` | string |  | ✓ |
| `usage` | string |  | ✓ |
| `sources` | string |  | ✓ |
| `response_duration` | number |  | ✓ |
| `was_stopped` | boolean |  | ✓ |
| `error` | string |  | ✓ |
| `thought_process` | string |  | ✓ |
| `thinking` | string |  | ✓ |
| `parent_message_id` | string |  | ✓ |
| `feedback` | string |  | ✓ |

## `conversations`

| Column | Type | Indexed | Optional |
|--------|------|---------|----------|
| `conversation_id` | string | ✓ |  |
| `title` | string |  |  |
| `project_id` | string | ✓ | ✓ |
| `created_at` | number |  |  |
| `updated_at` | number |  |  |
| `is_deleted` | boolean | ✓ |  |

## `projects`

| Column | Type | Indexed | Optional |
|--------|------|---------|----------|
| `project_id` | string | ✓ |  |
| `name` | string |  |  |
| `created_at` | number |  |  |
| `updated_at` | number |  |  |
| `is_deleted` | boolean | ✓ |  |

## `memories`

| Column | Type | Indexed | Optional |
|--------|------|---------|----------|
| `type` | string | ✓ |  |
| `namespace` | string | ✓ |  |
| `key` | string | ✓ |  |
| `value` | string |  |  |
| `raw_evidence` | string |  |  |
| `confidence` | number |  |  |
| `pii` | boolean | ✓ |  |
| `composite_key` | string | ✓ |  |
| `unique_key` | string | ✓ |  |
| `created_at` | number | ✓ |  |
| `updated_at` | number |  |  |
| `embedding` | string |  | ✓ |
| `embedding_model` | string |  | ✓ |
| `is_deleted` | boolean | ✓ |  |

## `modelPreferences`

| Column | Type | Indexed | Optional |
|--------|------|---------|----------|
| `wallet_address` | string | ✓ |  |
| `models` | string |  | ✓ |

## `userPreferences`

| Column | Type | Indexed | Optional |
|--------|------|---------|----------|
| `wallet_address` | string | ✓ |  |
| `nickname` | string |  | ✓ |
| `occupation` | string |  | ✓ |
| `description` | string |  | ✓ |
| `models` | string |  | ✓ |
| `personality` | string |  | ✓ |
| `created_at` | number |  |  |
| `updated_at` | number |  |  |

## `display_interactions`

| Column | Type | Indexed | Optional |
|--------|------|---------|----------|
| `interaction_id` | string | ✓ |  |
| `conversation_id` | string | ✓ |  |
| `message_id` | string | ✓ | ✓ |
| `display_type` | string |  |  |
| `tool_version` | number |  |  |
| `result` | string |  |  |
| `created_at` | number | ✓ |  |
| `updated_at` | number |  |  |

## `media`

| Column | Type | Indexed | Optional |
|--------|------|---------|----------|
| `media_id` | string | ✓ |  |
| `wallet_address` | string | ✓ |  |
| `message_id` | string | ✓ | ✓ |
| `conversation_id` | string | ✓ | ✓ |
| `name` | string |  |  |
| `mime_type` | string | ✓ |  |
| `media_type` | string | ✓ |  |
| `size` | number |  |  |
| `role` | string | ✓ |  |
| `model` | string | ✓ | ✓ |
| `source_url` | string |  | ✓ |
| `dimensions` | string |  | ✓ |
| `duration` | number |  | ✓ |
| `metadata` | string |  | ✓ |
| `created_at` | number | ✓ |  |
| `updated_at` | number |  |  |
| `is_deleted` | boolean | ✓ |  |

## Migration History

| Version | Changes |
|---------|---------|
| v15 | Added `display_interactions` table |
| v14 | Added `feedback` to `history` |
| v13 | Added `parent_message_id` to `history` |
| v12 | Added `chunks` to `history` |
| v11 | Added `media` table; Added `file_ids` to `history` |
| v10 | Added `projects` table; Added `project_id` to `conversations` |
| v9 | Added `thinking` to `history` |
| v8 | `DELETE FROM history;`; `DELETE FROM conversations;`; `DELETE FROM memories;` |
| v7 | Added `userPreferences` table |
| v6 | Added `thought_process` to `history` |
| v5 | Added `error` to `history` |
| v4 | Added `modelPreferences` table |
| v3 | Added `was_stopped` to `history` |
| v2 | Baseline — `history`, `conversations`, and `memories` tables |
