# loadBabelParser

> **loadBabelParser**(): `Promise`<`void`>

Defined in: src/tools/babelParser.ts:11

Load `@babel/parser` on demand; await it before calling `parseJsx`,
`parseDocumentDsl` or `renderAnumaJsx` directly (the slide, document and
app tools await it themselves).

## Returns

`Promise`<`void`>
