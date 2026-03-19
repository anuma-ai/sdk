# Logger

Defined in: [src/lib/logger.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/logger.ts#23)

Pluggable logger for the Anuma SDK.

By default all SDK logging goes to `console`. Call [setLogger](../functions/setLogger.md) at app
init (or use `<LoggerProvider>` in React) to redirect output to your own
logging infrastructure (PostHog, Datadog, Sentry, etc.).

## Example

```ts
import { setLogger, type Logger } from "@anuma/sdk";

const myLogger: Logger = {
  debug: () => {},
  info: (...args) => posthog.capture("sdk_info", { message: args }),
  warn: (...args) => console.warn("[SDK]", ...args),
  error: (...args) => Sentry.captureMessage(args.join(" ")),
};

setLogger(myLogger);
```

## Properties

### debug()

> **debug**: (...`args`: `unknown`\[]) => `void`

Defined in: [src/lib/logger.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/logger.ts#24)

**Parameters**

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

...`args`

</td>
<td>

`unknown`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### error()

> **error**: (...`args`: `unknown`\[]) => `void`

Defined in: [src/lib/logger.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/logger.ts#28)

**Parameters**

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

...`args`

</td>
<td>

`unknown`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### info()

> **info**: (...`args`: `unknown`\[]) => `void`

Defined in: [src/lib/logger.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/logger.ts#26)

Not used internally by the SDK today, but included so custom loggers can receive all standard levels.

**Parameters**

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

...`args`

</td>
<td>

`unknown`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### warn()

> **warn**: (...`args`: `unknown`\[]) => `void`

Defined in: [src/lib/logger.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/logger.ts#27)

**Parameters**

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

...`args`

</td>
<td>

`unknown`\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
