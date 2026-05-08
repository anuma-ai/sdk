# clearLazyTitleCache

> **clearLazyTitleCache**(): `void`

Defined in: [src/lib/db/chat/lazyDecrypt.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/lazyDecrypt.ts#100)

Drop every cached plaintext title and pending decrypt promise.

Wired into `clearAllEncryptionState()` via the listener registry in
`useEncryption.ts`. Also exported so consumers can clear the cache
proactively (e.g. on wallet switch within a session before the
full encryption-state teardown lands).

## Returns

`void`
