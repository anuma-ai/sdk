# webPlatformStorage

> `const` **webPlatformStorage**: [`PlatformStorage`](../interfaces/PlatformStorage.md)

Defined in: [src/lib/db/manager.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/manager.ts#86)

Default PlatformStorage implementation for web browsers.
Uses localStorage for persistent storage, sessionStorage for session-scoped storage,
and indexedDB.deleteDatabase for database deletion.
