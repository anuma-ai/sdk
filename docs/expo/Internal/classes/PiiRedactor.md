# PiiRedactor

Defined in: [src/lib/pii/redactor.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#69)

Stateful PII redactor that tracks placeholder assignments across multiple
calls. Create one per conversation so "\[EMAIL\_1]" always refers to the
same email address throughout the conversation.

## Constructors

### Constructor

> **new PiiRedactor**(`options`: [`PiiRedactorOptions`](../interfaces/PiiRedactorOptions.md)): `PiiRedactor`

Defined in: [src/lib/pii/redactor.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#101)

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

`options`

</td>
<td>

[`PiiRedactorOptions`](../interfaces/PiiRedactorOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`PiiRedactor`

## Accessors

### size

**Get Signature**

> **get** **size**(): `number`

Defined in: [src/lib/pii/redactor.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#132)

Returns the current number of unique PII values tracked.

**Returns**

`number`

## Methods

### clear()

> **clear**(): `void`

Defined in: [src/lib/pii/redactor.ts:378](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#378)

Reset all state. Useful for testing or when starting a fresh conversation.

**Returns**

`void`

***

### deAnonymize()

> **deAnonymize**(`text`: `string`): `string`

Defined in: [src/lib/pii/redactor.ts:289](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#289)

Restore original PII values in text that contains placeholders.
Used to de-anonymize LLM responses before displaying to the user.

Exact: matches the literal `[EMAIL_1]` form only. The storage paths use
[restoreForStorage](#restoreforstorage) instead, which tolerates the mangled echoes the
extraction models produce.

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

`text`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`string`

***

### getMappings()

> **getMappings**(): `ReadonlyMap`<`string`, `string`>

Defined in: [src/lib/pii/redactor.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#141)

Returns a snapshot of all placeholder → original value mappings.
Useful for debugging or UI display. This is a copy — mutating it (or
later redactions) does not affect the returned map and vice versa.

**Returns**

`ReadonlyMap`<`string`, `string`>

***

### maskText()

> **maskText**(`text`: `string`): `string`

Defined in: [src/lib/pii/redactor.ts:230](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#230)

Mask PII with unnumbered, NON-reversible tokens (\[EMAIL], \[SSN], …) without
mutating this instance's state. Use for one-way purposes where the value is
never restored — notably embedding inputs: it keeps real PII off the
embeddings endpoint while staying deterministic, so the same content always
masks identically and search stays consistent across conversations.

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

`text`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`string`

***

### redactMessages()

> **redactMessages**(`messages`: [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]): [`MessageRedactionResult`](../interfaces/MessageRedactionResult.md)

Defined in: [src/lib/pii/redactor.ts:244](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#244)

Redact PII from an array of LlmapiMessage objects.
Returns new message objects — originals are not mutated.

All roles' text content is redacted, not just user/system: tool results
can return PII fetched from external systems, and assistant history is
persisted with original (de-anonymized) values, so both must be re-redacted
before they go back over the wire. Placeholders the model already emitted
are inert here (they don't match any PII pattern), so re-redaction is safe.

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

`messages`

</td>
<td>

[`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

[`MessageRedactionResult`](../interfaces/MessageRedactionResult.md)

***

### redactText()

> **redactText**(`text`: `string`): [`RedactionResult`](../interfaces/RedactionResult.md)

Defined in: [src/lib/pii/redactor.ts:219](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#219)

Scan and redact PII from a single text string, using numbered, reversible
placeholders (\[EMAIL\_1], …) tracked on this instance.

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

`text`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

[`RedactionResult`](../interfaces/RedactionResult.md)

***

### restoreForStorage()

> **restoreForStorage**(`text`: `string`): `object`

Defined in: [src/lib/pii/redactor.ts:321](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/redactor.ts#321)

De-anonymize for PERSISTENCE (auto-extraction / consolidation), tolerant of
the ways the extraction models mangle a placeholder when echoing it back:
dropped brackets (`EMAIL_1`) and changed case (`email_1` / `Email_1`).

Returns the restored text plus `unresolved` — true when a placeholder-shaped
token for one of this redactor's categories was NOT assigned during
redaction (a model hallucination, or an ambiguous re-cased collision).
Callers drop/degrade such facts so an opaque token never reaches the vault.

One left-to-right pass over the ORIGINAL text. Two properties matter:

* a restored value is never re-scanned — so a real value that happens to
  contain a `<CATEGORY>_<n>` substring (e.g. the email `ssn_1@example.com`,
  or an API key containing `EMAIL_1`) is neither corrupted nor false-flagged;
* `unresolved` is derived from the lookup miss during this pass, not from a
  regex re-scan of the output — so it can't trip over a restored value.

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

`text`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`object`

**text**

> **text**: `string`

**unresolved**

> **unresolved**: `boolean`
