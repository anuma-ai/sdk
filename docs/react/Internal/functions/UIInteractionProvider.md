# UIInteractionProvider

> **UIInteractionProvider**(`__namedParameters`: [`UIInteractionProviderProps`](../type-aliases/UIInteractionProviderProps.md)): `FunctionComponentElement`<`ProviderProps`<[`UIInteractionContextValue`](../type-aliases/UIInteractionContextValue.md) | `null`>>

Defined in: [src/react/useUIInteraction.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#L79)

Provider for managing UI interactions between LLM tools and user.

This provider manages pending interactions that are created when the LLM
calls a UI interaction tool (like prompt\_user\_choice). The interactions
are rendered inline in the chat, and when the user responds, the provider
resolves the promise to send the result back to the LLM.

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

[`UIInteractionProviderProps`](../type-aliases/UIInteractionProviderProps.md)

</td>
</tr>
</tbody>
</table>

## Returns

`FunctionComponentElement`<`ProviderProps`<[`UIInteractionContextValue`](../type-aliases/UIInteractionContextValue.md) | `null`>>
