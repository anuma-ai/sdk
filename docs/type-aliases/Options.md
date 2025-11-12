---
title: Options
---

[**ai-sdk**](../README.md)

***

[ai-sdk](../README.md) / Options

# Type Alias: Options\<TData, ThrowOnError\>

> **Options**\<`TData`, `ThrowOnError`\> = `Options2`\<`TData`, `ThrowOnError`\> & `object`

Defined in: [sdk.gen.ts:7](https://github.com/zeta-chain/ai-sdk/blob/5c8e243af9a466a50f7d4fa3d6a0b9627b185419/src/client/sdk.gen.ts#L7)

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
