# FileProcessingReason

> **FileProcessingReason** = `"too_large"` | `"unsupported_type"` | `"no_data"` | `"empty"` | `"timeout"` | `"error"`

Defined in: [src/lib/processors/types.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#121)

Why a file was not (fully) read. Paired with [FileProcessingStatus](../interfaces/FileProcessingStatus.md).

* `too_large`: over `maxFileSizeBytes`
* `unsupported_type`: no processor handles the file's type
* `no_data`: the file has no URL/data to read
* `empty`: the file was read but contained no extractable content
* `timeout`: processing exceeded `timeoutMs`
* `error`: the processor threw (corrupt, password-protected, …)
