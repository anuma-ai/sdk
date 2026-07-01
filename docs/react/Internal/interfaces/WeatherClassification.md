# WeatherClassification

Defined in: [src/lib/chat/weatherClassifier.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/weatherClassifier.ts#23)

## Properties

### needsWeather

> **needsWeather**: `boolean`

Defined in: [src/lib/chat/weatherClassifier.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/weatherClassifier.ts#25)

Whether the prompt likely asks for weather data.

***

### noWeatherScore

> **noWeatherScore**: `number`

Defined in: [src/lib/chat/weatherClassifier.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/weatherClassifier.ts#29)

Cosine similarity to the "no weather" centroid.

***

### weatherScore

> **weatherScore**: `number`

Defined in: [src/lib/chat/weatherClassifier.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/weatherClassifier.ts#27)

Cosine similarity to the "needs weather" centroid.
