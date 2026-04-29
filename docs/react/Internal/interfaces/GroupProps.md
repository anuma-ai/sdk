# GroupProps

Defined in: [src/react/anumaRuntime.tsx:457](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#457)

Structural group. Defaults to absolute positioning of children;
opt into flex via `layout="row" | "column"`.

## Extends

* `CommonProps`.`ContainerLayoutProps`

## Properties

### align?

> `optional` **align**: `string`

Defined in: [src/react/anumaRuntime.tsx:177](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#177)

**Inherited from**

`ContainerLayoutProps.align`

***

### alignSelf?

> `optional` **alignSelf**: `string`

Defined in: [src/react/anumaRuntime.tsx:169](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#169)

**Inherited from**

`CommonProps.alignSelf`

***

### children?

> `optional` **children**: `ReactNode`

Defined in: [src/react/anumaRuntime.tsx:281](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#281)

**Inherited from**

`CommonProps.children`

***

### fill?

> `optional` **fill**: `string`

Defined in: [src/react/anumaRuntime.tsx:467](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#467)

Background fill, applied as `background-color` on the Group's
div. Resolves theme color tokens (e.g. "accent", "card") via
`resolveThemeColor`. Mirrors the `fill` prop on Rect/Circle/Line —
a Group is a layout container, but design-tool consumers
frequently want it to also carry a fill (auto-layout frames, card
surfaces, button bodies). `style.background` still works as an
override / for gradients.

***

### gap?

> `optional` **gap**: `number`

Defined in: [src/react/anumaRuntime.tsx:174](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#174)

**Inherited from**

`ContainerLayoutProps.gap`

***

### grow?

> `optional` **grow**: `number`

Defined in: [src/react/anumaRuntime.tsx:167](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#167)

**Inherited from**

`CommonProps.grow`

***

### h?

> `optional` **h**: `number`

Defined in: [src/react/anumaRuntime.tsx:165](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#165)

**Inherited from**

`CommonProps.h`

***

### id?

> `optional` **id**: `string`

Defined in: [src/react/anumaRuntime.tsx:279](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#279)

**Inherited from**

`CommonProps.id`

***

### justify?

> `optional` **justify**: `string`

Defined in: [src/react/anumaRuntime.tsx:176](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#176)

**Inherited from**

`ContainerLayoutProps.justify`

***

### layout?

> `optional` **layout**: `string`

Defined in: [src/react/anumaRuntime.tsx:173](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#173)

**Inherited from**

`ContainerLayoutProps.layout`

***

### padding?

> `optional` **padding**: `number`

Defined in: [src/react/anumaRuntime.tsx:175](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#175)

**Inherited from**

`ContainerLayoutProps.padding`

***

### rotation?

> `optional` **rotation**: `number`

Defined in: [src/react/anumaRuntime.tsx:166](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#166)

**Inherited from**

`CommonProps.rotation`

***

### shrink?

> `optional` **shrink**: `number`

Defined in: [src/react/anumaRuntime.tsx:168](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#168)

**Inherited from**

`CommonProps.shrink`

***

### style?

> `optional` **style**: `CSSProperties`

Defined in: [src/react/anumaRuntime.tsx:280](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#280)

**Inherited from**

`CommonProps.style`

***

### w?

> `optional` **w**: `number`

Defined in: [src/react/anumaRuntime.tsx:164](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#164)

**Inherited from**

`CommonProps.w`

***

### x?

> `optional` **x**: `number`

Defined in: [src/react/anumaRuntime.tsx:162](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#162)

**Inherited from**

`CommonProps.x`

***

### y?

> `optional` **y**: `number`

Defined in: [src/react/anumaRuntime.tsx:163](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#163)

**Inherited from**

`CommonProps.y`
