# DEFAULT\_EXCLUDED\_SERVER\_TOOLS

> `const` **DEFAULT\_EXCLUDED\_SERVER\_TOOLS**: readonly `string`\[]

Defined in: [src/lib/tools/serverTools.ts:1222](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1222)

Default exclusions baked into `defaultServerToolsFilter`.

* `AnumaVisionMCP-anuma_analyze_image`: modern frontier models have native
  vision via image content blocks; routing through a server-side vision
  tool just adds a hop.
* `OpenMeteoMCP-weather_forecast` + `OpenMeteoMCP-geocoding`: redundant when
  the consumer registers `createWeatherTool` (the client-side display tool
  handles geocoding internally and renders a card inline). Including the
  server-side equivalents causes the model to prefer raw data over the card.
  Consumers who don't register `createWeatherTool` should instead build
  their own filter via `createServerToolsFilter`.
