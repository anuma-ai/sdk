# LlmapiToolChoiceMode

> **LlmapiToolChoiceMode** = `"none"` | `"auto"` | `"required"`

Defined in: [src/client/types.gen.ts:794](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L794)

Mode controls which (if any) tool is called by the model.

* "none" means the model will not call any tool and instead generates a message.
* "auto" means the model can pick between generating a message or calling one or more tools.
* "required" means the model must call one or more tools.
