# WeatherClassification

Defined in: [src/lib/chat/weatherClassifier.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/weatherClassifier.ts#9)

## Properties

### needsWeather

> **needsWeather**: `boolean`

Defined in: [src/lib/chat/weatherClassifier.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/weatherClassifier.ts#11)

Whether the prompt likely asks for weather data.

***

### noWeatherScore

> **noWeatherScore**: `number`

Defined in: [src/lib/chat/weatherClassifier.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/weatherClassifier.ts#15)

Cosine similarity to the "no weather" centroid.

***

### weatherScore

> **weatherScore**: `number`

Defined in: [src/lib/chat/weatherClassifier.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/weatherClassifier.ts#13)

Cosine similarity to the "needs weather" centroid.
