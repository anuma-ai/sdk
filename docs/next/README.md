# Overview

Next.js configuration plugin for @reverbia/sdk

Use this to automatically configure Webpack aliases and server exclusions
needed for the SDK's dependencies.

## Example

```ts
// next.config.ts
import { withReverbia } from "@reverbia/sdk/next";

const nextConfig = {
  // your config...
};

export default withReverbia(nextConfig);
```

## Functions

| Function | Description |
| ------ | ------ |
| [withReverbia](Internal/functions/withReverbia.md) | - |
