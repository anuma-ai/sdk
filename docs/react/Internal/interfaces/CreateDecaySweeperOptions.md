# CreateDecaySweeperOptions

Defined in: [src/lib/memory/decayWorker.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#67)

## Properties

### classifier?

> `optional` **classifier**: [`DecayClassifier`](DecayClassifier.md)

Defined in: [src/lib/memory/decayWorker.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#81)

PR5 seam. When provided, each candidate's rule verdict is passed through
it. Gate on key availability (it may decrypt content). Default undefined.

***

### now?

> `optional` **now**: [`NowSource`](../type-aliases/NowSource.md)

Defined in: [src/lib/memory/decayWorker.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#74)

Reference "now". A number is fixed (deterministic tests); a function is
re-evaluated per sweep (long-lived interval usage). Default `Date.now`.

***

### onError()?

> `optional` **onError**: (`error`: `Error`) => `void`

Defined in: [src/lib/memory/decayWorker.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#85)

Diagnostic — fires on an unexpected sweep-level error.

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

`error`

</td>
<td>

`Error`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### onSwept()?

> `optional` **onSwept**: (`result`: [`DecaySweepResult`](DecaySweepResult.md)) => `void`

Defined in: [src/lib/memory/decayWorker.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#83)

Fires once after each sweep with the transition counts (UI).

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

`result`

</td>
<td>

[`DecaySweepResult`](DecaySweepResult.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### policy?

> `optional` **policy**: `Partial`<[`DecayPolicy`](DecayPolicy.md)>

Defined in: [src/lib/memory/decayWorker.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#76)

Partial policy overriding the per-type TTL defaults. Omit for defaults.

***

### vaultCtx

> **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/decayWorker.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decayWorker.ts#69)

Vault write context — the same one recall/retain use.
