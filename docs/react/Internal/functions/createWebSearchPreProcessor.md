# createWebSearchPreProcessor

> **createWebSearchPreProcessor**(`options`: [`WebSearchPreProcessorOptions`](../interfaces/WebSearchPreProcessorOptions.md)): [`PromptPreProcessor`](../type-aliases/PromptPreProcessor.md)

Defined in: [src/lib/chat/webSearchClassifier.ts:153](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/webSearchClassifier.ts#153)

Build a pre-processor that runs web-search classification on the
shared embedding provided by `runToolLoop`, and — if the classifier
decides a search is warranted — invokes the caller-supplied
`fetchSearchResults` and injects the result into the conversation.

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

`options`

</td>
<td>

[`WebSearchPreProcessorOptions`](../interfaces/WebSearchPreProcessorOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`PromptPreProcessor`](../type-aliases/PromptPreProcessor.md)

## Examples

```ts
import { runToolLoop, createWebSearchPreProcessor } from "@anuma/sdk/server";

const webSearch = createWebSearchPreProcessor({
  fetchSearchResults: async (prompt, { signal }) => {
    const res = await mySearchProvider.query(prompt, { signal });
    return res.results.map((r) => `- ${r.title}: ${r.snippet}`).join("\n");
  },
});

await runToolLoop({
  messages,
  model,
  token,
  preProcessors: [webSearch],
});
```

```ts
const observer = createWebSearchPreProcessor({
  onClassification: ({ needsWebSearch, searchScore, noSearchScore }) => {
    metrics.record({ needsWebSearch, searchScore, noSearchScore });
  },
});
```

```ts
const webSearch = createWebSearchPreProcessor({
  fetchSearchResults: async (prompt, { signal }) => {
    const results = await mySearchProvider.query(prompt, { signal });
    return [
      {
        role: "system",
        content: [{ type: "text", text: `Search results for "${prompt}":\n${formatResults(results)}` }],
      },
    ];
  },
});
```
