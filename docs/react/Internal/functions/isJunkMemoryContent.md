# isJunkMemoryContent

> **isJunkMemoryContent**(`content`: `string`): `boolean`

Defined in: [src/lib/memory/junkGate.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/junkGate.ts#67)

True when `content` is too low-signal to be a durable memory, i.e. it should
NOT be written to the vault.

Normalizes exactly like the extraction gate did (trim + strip trailing
sentence punctuation), then rejects when ANY of these hold:

1. **Too short.** Below the length floor — [MIN\_CONTENT\_LENGTH](../variables/MIN_CONTENT_LENGTH.md) (3) for
   Latin/other scripts, or 2 when the string contains a CJK/ideographic
   character (a 2-char kanji word is a full fact). So "cat"/"独身" pass; "hi"
   is rejected.
2. **Pure punctuation / symbols.** No letter AND no digit anywhere
   (`!/[\p{L}\p{N}]/u`). Rejects "---" and "  .." while letting anything with
   a letter or a digit through — so "555-1234", "2024" and a postcode survive.
3. **Short bare integer.** A purely-digit token of length ≤ 3 ("1", "2", "42",
   "999"). These are overwhelmingly list-index / rating / rank scraps — the
   exact junk the model smuggled in before the shared gate existed. A 4+ digit
   run is allowed because it is far more likely a meaningful number (a year
   like "2024", a PIN, a house number). Trade-off: a genuine 1–3 digit fact is
   rare and reads better re-stated with context, so we bias toward rejecting
   bare short integers. Mixed digit+punctuation ("555-1234") is NOT purely
   numeric and passes.

Deliberately NO "single token / no whitespace" heuristic — that was an
English-only signal that silently dropped every CJK fact and killed legit
one-word facts.

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

`content`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`boolean`
