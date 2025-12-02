---
title: Options
---

[@reverbia/sdk](../globals.md) / Options

# Type Alias: Options\<TData, ThrowOnError\>

> **Options**\<`TData`, `ThrowOnError`\> = `Options2`\<`TData`, `ThrowOnError`\> & `object`

Defined in: [sdk.gen.ts:7](https://github.com/zeta-chain/ai-sdk/blob/5213c99afc802a0b2f67e118eea280a5c0810a9a/src/client/sdk.gen.ts#L7)

## Type Declaration

### client?

> `optional` **client**: `Client`

You can provide a client instance returned by `createClient()` instead of
individual options. This might be also useful if you want to implement a
custom client.

### meta?

> `optional` **meta**: `Record`\<`string`, `unknown`\>

You can pass arbitrary values through the `meta` object. This can be
used to access values that aren't defined as part of the SDK function.

## Type Parameters

### TData

`TData` *extends* `TDataShape` = `TDataShape`

### ThrowOnError

`ThrowOnError` *extends* `boolean` = `boolean`
