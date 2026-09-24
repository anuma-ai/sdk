# attachFileContextToLastUserMessage

> **attachFileContextToLastUserMessage**(`messages`: [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[], `fileContext`: `string`): [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]

Defined in: [src/lib/chat/fileContext.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/fileContext.ts#63)

Put the current turn's extracted attachment contents on the last user
message, as a text part inserted right after that message's LAST text part:
after everything the user wrote, and before any parts that follow it
(typically images). With interleaved parts such as `[text, image, text,
image]` it lands between the second text and the second image.

Why not a system message: a detached system message at the front of the
request ("the user has attached files to this conversation") is separated
from the words that refer to it by the whole system prompt, tool catalog and
history. In a long, multi-file conversation fast models stopped connecting
the two and told users the attachment was unreadable even though its text
was in the request. Keeping the contents on the turn that attached them is
how native file attachments work on every provider, and survives the auto
router switching models between turns.

The part goes AFTER the user's own text because the portal's query
classifier routes on the first text part of the last user message — it must
keep reading the user's prompt, not the document.

Returns a new array; the input is not mutated. When there is no user
message the messages are returned unchanged.

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

`messages`

</td>
<td>

[`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]

</td>
</tr>
<tr>
<td>

`fileContext`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

[`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]
