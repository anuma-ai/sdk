---
title: withReverbia
---

[SDK Documentation](../../README.md) / [next](../README.md) / withReverbia

# Function: withReverbia()

> **withReverbia**(`nextConfig`): `any`

Defined in: [next/index.ts:19](https://github.com/zeta-chain/ai-sdk/blob/main/src/next/index.ts#L19)

Next.js configuration plugin for @reverbia/sdk

Use this to automatically configure Webpack aliases and server exclusions
needed for the SDK's AI dependencies (transformers.js, onnxruntime, etc).

## Parameters

### nextConfig

`any` = `{}`

## Returns

`any`

## Example

```ts
// next.config.ts
import { withReverbia } from "@reverbia/sdk/next";

const nextConfig = {
  // your config...
};

export default withReverbia(nextConfig);
```
