# PiiPattern

Defined in: [src/lib/pii/patterns.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/patterns.ts#18)

## Properties

### category

> **category**: `string` & `object` | [`PiiCategory`](../type-aliases/PiiCategory.md)

Defined in: [src/lib/pii/patterns.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/patterns.ts#23)

Placeholder tag prefix for matches. Built-ins use [PiiCategory](../type-aliases/PiiCategory.md);
custom patterns may use any string (e.g. "PASSPORT", "IBAN").

***

### context?

> `optional` **context**: `RegExp`

Defined in: [src/lib/pii/patterns.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/patterns.ts#35)

Optional context guard. When set, a match is only redacted if this regex
matches the text immediately preceding it (a short window). Used to require
a cue word — e.g. only treat a date as a date-of-birth when "DOB" / "born"
appears just before it. Implemented with a window slice rather than a
lookbehind so it works on engines without lookbehind support (Hermes,
older Safari).

***

### regex

> **regex**: `RegExp`

Defined in: [src/lib/pii/patterns.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/patterns.ts#24)

***

### validate()?

> `optional` **validate**: (`match`: `string`) => `boolean`

Defined in: [src/lib/pii/patterns.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/patterns.ts#26)

Optional post-match validation to reduce false positives.

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

`match`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`boolean`
