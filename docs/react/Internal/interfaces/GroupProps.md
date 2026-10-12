# GroupProps

Defined in: [src/react/anumaRuntime.tsx:402](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#402)

Structural group. Defaults to absolute positioning of children;
opt into flex via `layout="row" | "column"`.

## Extends

* `CommonProps`.`ContainerLayoutProps`

## Properties

### align?

> `optional` **align**: `string`

Defined in: [src/react/anumaRuntime.tsx:161](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#161)

**Inherited from**

`ContainerLayoutProps.align`

***

### alignSelf?

> `optional` **alignSelf**: `string`

Defined in: [src/react/anumaRuntime.tsx:153](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#153)

**Inherited from**

`CommonProps.alignSelf`

***

### children?

> `optional` **children**: `ReactNode`

Defined in: [src/react/anumaRuntime.tsx:242](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#242)

**Inherited from**

`CommonProps.children`

***

### fill?

> `optional` **fill**: `string`

Defined in: [src/react/anumaRuntime.tsx:412](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#412)

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

Defined in: [src/react/anumaRuntime.tsx:158](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#158)

**Inherited from**

`ContainerLayoutProps.gap`

***

### grow?

> `optional` **grow**: `number`

Defined in: [src/react/anumaRuntime.tsx:151](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#151)

**Inherited from**

`CommonProps.grow`

***

### h?

> `optional` **h**: `number`

Defined in: [src/react/anumaRuntime.tsx:149](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#149)

**Inherited from**

`CommonProps.h`

***

### id?

> `optional` **id**: `string`

Defined in: [src/react/anumaRuntime.tsx:240](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#240)

**Inherited from**

`CommonProps.id`

***

### justify?

> `optional` **justify**: `string`

Defined in: [src/react/anumaRuntime.tsx:160](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#160)

**Inherited from**

`ContainerLayoutProps.justify`

***

### layout?

> `optional` **layout**: `string`

Defined in: [src/react/anumaRuntime.tsx:157](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#157)

**Inherited from**

`ContainerLayoutProps.layout`

***

### padding?

> `optional` **padding**: `number`

Defined in: [src/react/anumaRuntime.tsx:159](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#159)

**Inherited from**

`ContainerLayoutProps.padding`

***

### rotation?

> `optional` **rotation**: `number`

Defined in: [src/react/anumaRuntime.tsx:150](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#150)

**Inherited from**

`CommonProps.rotation`

***

### shrink?

> `optional` **shrink**: `number`

Defined in: [src/react/anumaRuntime.tsx:152](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#152)

**Inherited from**

`CommonProps.shrink`

***

### style?

> `optional` **style**: `CSSProperties`

Defined in: [src/react/anumaRuntime.tsx:241](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#241)

**Inherited from**

`CommonProps.style`

***

### w?

> `optional` **w**: `number`

Defined in: [src/react/anumaRuntime.tsx:148](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#148)

**Inherited from**

`CommonProps.w`

***

### x?

> `optional` **x**: `number`

Defined in: [src/react/anumaRuntime.tsx:146](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#146)

**Inherited from**

`CommonProps.x`

***

### y?

> `optional` **y**: `number`

Defined in: [src/react/anumaRuntime.tsx:147](https://github.com/anuma-ai/sdk/blob/main/src/react/anumaRuntime.tsx#147)

**Inherited from**

`CommonProps.y`
