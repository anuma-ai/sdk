# Overview

Next.js configuration plugin for @anuma/sdk

Use this to automatically configure Webpack aliases and server exclusions
needed for the SDK's dependencies.

## Example

```ts
// next.config.ts
import { withAnuma } from "@anuma/sdk/next";

const nextConfig = {
  // your config...
};

export default withAnuma(nextConfig);
```

## Functions

| Function | Description |
| ------ | ------ |
| [withAnuma](Internal/functions/withAnuma.md) | - |
