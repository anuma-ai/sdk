# injectionSignatureCatalog

> **injectionSignatureCatalog**(): `object`\[]

Defined in: [src/lib/memory/injectionScreen.ts:332](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#332)

Content-free catalog of the active signatures (id + reason, no patterns).
Exposed so a security review / audit surface can enumerate coverage
without reaching into module internals. Does not leak any user content.

## Returns

`object`\[]
