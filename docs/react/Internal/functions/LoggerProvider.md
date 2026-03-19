# LoggerProvider

> **LoggerProvider**(`__namedParameters`: [`LoggerProviderProps`](../interfaces/LoggerProviderProps.md)): `ReactNode`

Defined in: [src/react/LoggerProvider.tsx:31](https://github.com/anuma-ai/sdk/blob/main/src/react/LoggerProvider.tsx#31)

Sets the active SDK logger for the lifetime of this component.
Restores the previous logger on unmount, so it can be nested or used
alongside a top-level `setLogger` call without discarding the outer logger.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`__namedParameters`

</td>
<td>

[`LoggerProviderProps`](../interfaces/LoggerProviderProps.md)

</td>
</tr>
</tbody>
</table>

## Returns

`ReactNode`

## Example

```tsx
import { LoggerProvider, type Logger } from "@anuma/sdk/react";

const myLogger: Logger = {
  debug: () => {},
  info: (...args) => posthog.capture("sdk_info", { message: args }),
  warn: (...args) => console.warn("[SDK]", ...args),
  error: (...args) => Sentry.captureMessage(args.join(" ")),
};

<LoggerProvider logger={myLogger}>
  <App />
</LoggerProvider>
```
