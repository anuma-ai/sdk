# ModelsGrantStatus

> **ModelsGrantStatus** = `string`

Defined in: [src/client/types.gen.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#139)

Status is where this grant sits in its payout lifecycle: "owed", "sent"
or "failed". A "failed" grant is still owed money — the payout path
retries it — and its amount is counted in OwedZeta accordingly.
