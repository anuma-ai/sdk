# RequestEncryptionKeyOptions

Defined in: [src/react/useEncryption.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#78)

Options for [requestEncryptionKey](../functions/requestEncryptionKey.md).

## Properties

### force?

> `optional` **force**: `boolean`

Defined in: [src/react/useEncryption.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#86)

When true, re-derive and replace any existing in-memory keys for this
address. Default false preserves the historical "if present, return"
short-circuit. Prefer [refreshEncryptionKeyIfMatches](../functions/refreshEncryptionKeyIfMatches.md) when the
caller has ciphertext that must keep working — force-replace can pin a
newly derived wrong key over a still-valid one.
