---
title: Options
---

[@reverbia/sdk](../globals.md) / Options

# Type Alias: Options\<TData, ThrowOnError\>

> **Options**\<`TData`, `ThrowOnError`\> = `Options2`\<`TData`, `ThrowOnError`\> & `object`

Defined in: [sdk.gen.ts:7](https://github.com/zeta-chain/ai-sdk/blob/a75794bb81ba266385e051ab7e34485d7229f825/src/client/sdk.gen.ts#L7)

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

`TData` _extends_ `TDataShape` = `TDataShape`

### ThrowOnError

`ThrowOnError` _extends_ `boolean` = `boolean`
