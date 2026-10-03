# HandlersConnectTicketRequest

> **HandlersConnectTicketRequest** = `object`

Defined in: [src/client/types.gen.ts:1787](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1787)

## Properties

### oauth\_app?

> `optional` **oauth\_app**: `string`

Defined in: [src/client/types.gen.ts:1788](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1788)

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1796](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1796)

Provider is the optional logical connector (gmail, gdrive, gcalendar,
github, notion, dropbox). One oauth\_app (e.g. google) can back several
providers, but the admin kill-switch toggles per provider — so we need
it to gate disabled connectors here. Older clients omit it and skip the
check (backward compatible).

***

### requested\_scopes?

> `optional` **requested\_scopes**: `string`\[]

Defined in: [src/client/types.gen.ts:1797](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1797)

***

### return\_to?

> `optional` **return\_to**: `string`

Defined in: [src/client/types.gen.ts:1798](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1798)
