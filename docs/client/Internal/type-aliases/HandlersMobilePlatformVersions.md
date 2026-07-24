# HandlersMobilePlatformVersions

> **HandlersMobilePlatformVersions** = `object`

Defined in: [src/client/types.gen.ts:2199](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2199)

Android versions for the Play Store build

## Properties

### latest\_version?

> `optional` **latest\_version**: `string`

Defined in: [src/client/types.gen.ts:2204](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2204)

LatestVersion is the newest version live in the platform's store;
older clients show a dismissible update nudge

***

### min\_supported\_version?

> `optional` **min\_supported\_version**: `string`

Defined in: [src/client/types.gen.ts:2209](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2209)

MinSupportedVersion is the oldest version still supported; older
clients are blocked behind an update-required wall
