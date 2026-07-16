# HandlersInferenceWeeklyResponse

> **HandlersInferenceWeeklyResponse** = `object`

Defined in: [src/client/types.gen.ts:2098](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2098)

## Properties

### total\_requests?

> `optional` **total\_requests**: `number`

Defined in: [src/client/types.gen.ts:2104](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2104)

TotalRequests is the all-time platform-wide inference request count (every row in `requests`),
for the headline. Distinct from summing `weeks`, which covers only the recent window. 0 if the
count couldn't be fetched this request.

***

### weeks?

> `optional` **weeks**: [`HandlersWeeklyInferenceItem`](HandlersWeeklyInferenceItem.md)\[]

Defined in: [src/client/types.gen.ts:2105](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2105)
