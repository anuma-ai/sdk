# LlmapiResponseResponse

> **LlmapiResponseResponse** = `GeneratedLlmapiResponseResponse` & `object`

Defined in: [src/clientCompat.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/clientCompat.ts#94)

Add the Responses API's terminal-state fields, which the portal's generated
schema does not declare.

Without them the two transports are asymmetric: a completions consumer reads
`choices[0].finish_reason` and can see a turn cut off at the output ceiling,
while a Responses consumer has no field to read at all — the truncation the
SDK *did* detect (see the normalization in `strategies/responses.ts`) died at
the stream boundary. `runToolLoop` works around this with `terminalState` on
its own result, but a caller holding only a response object cannot (#805).

These are standard OpenAI Responses fields, so this widens the type toward
the wire rather than inventing shape: they are optional because a
non-streaming direct call returns only what the portal serializes today.
Drop the override once the portal declares them upstream.

## Type Declaration

### incomplete\_details?

> `optional` **incomplete\_details**: `object`

Present when `status` is `"incomplete"`; `"max_output_tokens"` is a truncation.

**incomplete\_details.reason?**

> `optional` **reason**: `string`

### status?

> `optional` **status**: `string`

`"completed"` | `"incomplete"` — the turn's own status, not an output item's.
