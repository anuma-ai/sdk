# Overview

React Native hooks for building AI-powered mobile applications.

The `@anuma/sdk/expo` package provides React hooks optimized for
Expo and React Native environments. These hooks exclude web-only
dependencies (like pdfjs-dist) that aren't compatible with React Native.

## Installation & Setup

Before using this package, you must set up polyfills for React Native compatibility.
See the polyfills module documentation for complete setup instructions.

Quick setup summary:

```bash
pnpm install @anuma/sdk web-streams-polyfill react-native-get-random-values @ethersproject/shims buffer
```

Then create an entrypoint file with all required polyfills. See
[ai-example-expo](https://github.com/zeta-chain/ai-example-expo) for a complete
working example.

## Differences from React Package

The Expo package is a lightweight subset of `@anuma/sdk/react`:

* No PDF text extraction (pdfjs-dist is web-only)
* Uses XMLHttpRequest for streaming (fetch streaming isn't supported in RN)

## Authentication

Use `@privy-io/expo` for authentication in React Native:

```typescript
import { PrivyProvider, usePrivy } from "@privy-io/expo";
import { useIdentityToken } from "@privy-io/expo";

// Wrap your app with PrivyProvider
<PrivyProvider appId="your-app-id" clientId="your-client-id">
  <App />
</PrivyProvider>;

// Get identity token for API calls
const { getIdentityToken } = useIdentityToken();
```

## Quick Start

```tsx
import { useIdentityToken } from "@privy-io/expo";
import { useChat } from "@anuma/sdk/expo";

function ChatScreen() {
  const { getIdentityToken } = useIdentityToken();

  const { isLoading, sendMessage, stop } = useChat({
    getToken: getIdentityToken,
    baseUrl: "https://portal.anuma-dev.ai",
    onData: (chunk) => {
      // Handle streaming chunks
      const content =
        typeof chunk === "string"
          ? chunk
          : chunk.choices?.[0]?.delta?.content || "";
      console.log("Received:", content);
    },
    onFinish: () => console.log("Stream finished"),
    onError: (error) => console.error("Error:", error),
  });

  const handleSend = async () => {
    await sendMessage({
      messages: [{ role: "user", content: [{ type: "text", text: "Hello!" }] }],
      model: "fireworks/accounts/fireworks/models/kimi-k2p5",
    });
  };

  return (
    <View>
      <Button onPress={handleSend} disabled={isLoading} title="Send" />
      {isLoading && <Button onPress={stop} title="Stop" />}
    </View>
  );
}
```

## Hooks

| Function | Description |
| ------ | ------ |
| [useChat](Hooks/useChat.md) | A React hook for managing chat completions with authentication. |
| [useChatStorage](Hooks/useChatStorage.md) | A React hook that wraps useChat with automatic message persistence using WatermelonDB. |

## Other

### archiveVaultMemoryOp

Re-exports [archiveVaultMemoryOp](../react/Internal/functions/archiveVaultMemoryOp.md)

***

### AutoExtractMessage

Re-exports [AutoExtractMessage](../react/Internal/interfaces/AutoExtractMessage.md)

***

### AutoExtractor

Re-exports [AutoExtractor](../react/Internal/interfaces/AutoExtractor.md)

***

### Budget

Re-exports [Budget](../react/Internal/type-aliases/Budget.md)

***

### CachedServerTools

Re-exports [CachedServerTools](../react/Internal/interfaces/CachedServerTools.md)

***

### capHopsForDensity

Re-exports [capHopsForDensity](../react/Internal/functions/capHopsForDensity.md)

***

### ChatConversation

Re-exports [ChatConversation](../react/Internal/classes/ChatConversation.md)

***

### ChatMessage

Re-exports [ChatMessage](../react/Internal/classes/ChatMessage.md)

***

### ChatRole

Re-exports [ChatRole](../react/Internal/type-aliases/ChatRole.md)

***

### chatStorageMigrations

Re-exports [chatStorageMigrations](../react/Internal/variables/chatStorageMigrations.md)

***

### chatStorageSchema

Re-exports [chatStorageSchema](../react/Internal/variables/chatStorageSchema.md)

***

### chunkAndEmbedAllMessages

Re-exports [chunkAndEmbedAllMessages](../react/Internal/functions/chunkAndEmbedAllMessages.md)

***

### chunkAndEmbedMessage

Re-exports [chunkAndEmbedMessage](../react/Internal/functions/chunkAndEmbedMessage.md)

***

### ChunkingOptions

Re-exports [ChunkingOptions](../react/Internal/interfaces/ChunkingOptions.md)

***

### chunkText

Re-exports [chunkText](../react/Internal/functions/chunkText.md)

***

### classifyCryptoPrice

Re-exports [classifyCryptoPrice](../react/Internal/functions/classifyCryptoPrice.md)

***

### classifyCryptoPriceBatch

Re-exports [classifyCryptoPriceBatch](../react/Internal/functions/classifyCryptoPriceBatch.md)

***

### classifyDecay

Re-exports [classifyDecay](../react/Internal/functions/classifyDecay.md)

***

### classifyStockPrice

Re-exports [classifyStockPrice](../react/Internal/functions/classifyStockPrice.md)

***

### classifyStockPriceBatch

Re-exports [classifyStockPriceBatch](../react/Internal/functions/classifyStockPriceBatch.md)

***

### classifyWeather

Re-exports [classifyWeather](../react/Internal/functions/classifyWeather.md)

***

### classifyWeatherBatch

Re-exports [classifyWeatherBatch](../react/Internal/functions/classifyWeatherBatch.md)

***

### classifyWebSearch

Re-exports [classifyWebSearch](../react/Internal/functions/classifyWebSearch.md)

***

### classifyWebSearchBatch

Re-exports [classifyWebSearchBatch](../react/Internal/functions/classifyWebSearchBatch.md)

***

### clearAllEncryptionKeys

Re-exports [clearAllEncryptionKeys](../react/Internal/functions/clearAllEncryptionKeys.md)

***

### clearAllEncryptionState

Re-exports [clearAllEncryptionState](../react/Internal/functions/clearAllEncryptionState.md)

***

### clearEncryptionKey

Re-exports [clearEncryptionKey](../react/Internal/functions/clearEncryptionKey.md)

***

### clearLazyTitleCache

Re-exports [clearLazyTitleCache](../react/Internal/functions/clearLazyTitleCache.md)

***

### clearServerToolsCache

Re-exports [clearServerToolsCache](../react/Internal/functions/clearServerToolsCache.md)

***

### consoleLogger

Re-exports [consoleLogger](../react/Internal/variables/consoleLogger.md)

***

### ConsolidationFallbackReason

Re-exports [ConsolidationFallbackReason](../react/Internal/type-aliases/ConsolidationFallbackReason.md)

***

### cosineInt8

Re-exports [cosineInt8](../react/Internal/functions/cosineInt8.md)

***

### createAutoExtractor

Re-exports [createAutoExtractor](../react/Internal/functions/createAutoExtractor.md)

***

### CreateAutoExtractorOptions

Re-exports [CreateAutoExtractorOptions](../react/Internal/interfaces/CreateAutoExtractorOptions.md)

***

### CreateConversationOptions

Re-exports [CreateConversationOptions](../react/Internal/interfaces/CreateConversationOptions.md)

***

### createCryptoPricePreProcessor

Re-exports [createCryptoPricePreProcessor](../react/Internal/functions/createCryptoPricePreProcessor.md)

***

### createDecaySweeper

Re-exports [createDecaySweeper](../react/Internal/functions/createDecaySweeper.md)

***

### CreateDecaySweeperOptions

Re-exports [CreateDecaySweeperOptions](../react/Internal/interfaces/CreateDecaySweeperOptions.md)

***

### createMemoryEngineTool

Re-exports [createMemoryEngineTool](../react/Internal/functions/createMemoryEngineTool.md)

***

### createMemoryVaultSearchTool

Re-exports [createMemoryVaultSearchTool](../react/Internal/functions/createMemoryVaultSearchTool.md)

***

### createMemoryVaultTool

Re-exports [createMemoryVaultTool](../react/Internal/functions/createMemoryVaultTool.md)

***

### CreateMessageOptions

Re-exports [CreateMessageOptions](../react/Internal/interfaces/CreateMessageOptions.md)

***

### createRecallTool

Re-exports [createRecallTool](../react/Internal/functions/createRecallTool.md)

***

### createStockPricePreProcessor

Re-exports [createStockPricePreProcessor](../react/Internal/functions/createStockPricePreProcessor.md)

***

### createVaultEmbeddingCache

Re-exports [createVaultEmbeddingCache](../react/Internal/functions/createVaultEmbeddingCache.md)

***

### createVaultFolderOp

Re-exports [createVaultFolderOp](../react/Internal/functions/createVaultFolderOp.md)

***

### CreateVaultFolderOptions

Re-exports [CreateVaultFolderOptions](../react/Internal/interfaces/CreateVaultFolderOptions.md)

***

### createVaultMemoriesBatchOp

Re-exports [createVaultMemoriesBatchOp](../react/Internal/functions/createVaultMemoriesBatchOp.md)

***

### createVaultMemoryOp

Re-exports [createVaultMemoryOp](../react/Internal/functions/createVaultMemoryOp.md)

***

### CreateVaultMemoryOptions

Re-exports [CreateVaultMemoryOptions](../react/Internal/interfaces/CreateVaultMemoryOptions.md)

***

### createWeatherPreProcessor

Re-exports [createWeatherPreProcessor](../react/Internal/functions/createWeatherPreProcessor.md)

***

### createWebSearchPreProcessor

Re-exports [createWebSearchPreProcessor](../react/Internal/functions/createWebSearchPreProcessor.md)

***

### CryptoPriceClassification

Re-exports [CryptoPriceClassification](../react/Internal/interfaces/CryptoPriceClassification.md)

***

### CryptoPricePreProcessorOptions

Re-exports [CryptoPricePreProcessorOptions](../react/Internal/interfaces/CryptoPricePreProcessorOptions.md)

***

### DatabaseManager

Re-exports [DatabaseManager](../react/Internal/classes/DatabaseManager.md)

***

### DatabaseManagerLogger

Re-exports [DatabaseManagerLogger](../react/Internal/interfaces/DatabaseManagerLogger.md)

***

### DatabaseManagerOptions

Re-exports [DatabaseManagerOptions](../react/Internal/interfaces/DatabaseManagerOptions.md)

***

### DecayCandidateRaw

Re-exports [DecayCandidateRaw](../react/Internal/interfaces/DecayCandidateRaw.md)

***

### DecayClassifier

Re-exports [DecayClassifier](../react/Internal/interfaces/DecayClassifier.md)

***

### DecayInput

Re-exports [DecayInput](../react/Internal/interfaces/DecayInput.md)

***

### DecayPolicy

Re-exports [DecayPolicy](../react/Internal/interfaces/DecayPolicy.md)

***

### DecaySweeper

Re-exports [DecaySweeper](../react/Internal/interfaces/DecaySweeper.md)

***

### DecaySweepResult

Re-exports [DecaySweepResult](../react/Internal/interfaces/DecaySweepResult.md)

***

### DecayVerdict

Re-exports [DecayVerdict](../react/Internal/type-aliases/DecayVerdict.md)

***

### decryptConversationTitle

Re-exports [decryptConversationTitle](../react/Internal/functions/decryptConversationTitle.md)

***

### DEFAULT\_CACHE\_EXPIRATION\_MS

Re-exports [DEFAULT\_CACHE\_EXPIRATION\_MS](../react/Internal/variables/DEFAULT_CACHE_EXPIRATION_MS.md)

***

### DEFAULT\_CHUNK\_OVERLAP

Re-exports [DEFAULT\_CHUNK\_OVERLAP](../react/Internal/variables/DEFAULT_CHUNK_OVERLAP.md)

***

### DEFAULT\_CHUNK\_SIZE

Re-exports [DEFAULT\_CHUNK\_SIZE](../react/Internal/variables/DEFAULT_CHUNK_SIZE.md)

***

### DEFAULT\_DECAY\_POLICY

Re-exports [DEFAULT\_DECAY\_POLICY](../react/Internal/variables/DEFAULT_DECAY_POLICY.md)

***

### DEFAULT\_MIN\_CHUNK\_SIZE

Re-exports [DEFAULT\_MIN\_CHUNK\_SIZE](../react/Internal/variables/DEFAULT_MIN_CHUNK_SIZE.md)

***

### DEFAULT\_VAULT\_CACHE\_SIZE

Re-exports [DEFAULT\_VAULT\_CACHE\_SIZE](../react/Internal/variables/DEFAULT_VAULT_CACHE_SIZE.md)

***

### deleteAllVaultMemoriesForUserOp

Re-exports [deleteAllVaultMemoriesForUserOp](../react/Internal/functions/deleteAllVaultMemoriesForUserOp.md)

***

### deleteVaultFolderOp

Re-exports [deleteVaultFolderOp](../react/Internal/functions/deleteVaultFolderOp.md)

***

### deleteVaultMemoryOp

Re-exports [deleteVaultMemoryOp](../react/Internal/functions/deleteVaultMemoryOp.md)

***

### dequantizeEmbedding

Re-exports [dequantizeEmbedding](../react/Internal/functions/dequantizeEmbedding.md)

***

### eagerEmbedContent

Re-exports [eagerEmbedContent](../react/Internal/functions/eagerEmbedContent.md)

***

### embedAllMessages

Re-exports [embedAllMessages](../react/Internal/functions/embedAllMessages.md)

***

### EmbeddedWalletSignerFn

Re-exports [EmbeddedWalletSignerFn](../react/Internal/type-aliases/EmbeddedWalletSignerFn.md)

***

### embedMessage

Re-exports [embedMessage](../react/Internal/functions/embedMessage.md)

***

### ensureDefaultFoldersOp

Re-exports [ensureDefaultFoldersOp](../react/Internal/functions/ensureDefaultFoldersOp.md)

***

### ENTITY\_FANOUT

Re-exports [ENTITY\_FANOUT](../react/Internal/variables/ENTITY_FANOUT.md)

***

### extractAndRetain

Re-exports [extractAndRetain](../react/Internal/functions/extractAndRetain.md)

***

### ExtractedCandidate

Re-exports [ExtractedCandidate](../react/Internal/interfaces/ExtractedCandidate.md)

***

### ExtractedEntity

Re-exports [ExtractedEntity](../react/Internal/interfaces/ExtractedEntity.md)

***

### extractFacts

Re-exports [extractFacts](../react/Internal/functions/extractFacts.md)

***

### ExtractFactsOptions

Re-exports [ExtractFactsOptions](../react/Internal/interfaces/ExtractFactsOptions.md)

***

### ExtractOutcome

Re-exports [ExtractOutcome](../react/Internal/type-aliases/ExtractOutcome.md)

***

### FactType

Re-exports [FactType](../react/Internal/type-aliases/FactType.md)

***

### FileMetadata

Re-exports [FileMetadata](../react/Internal/interfaces/FileMetadata.md)

***

### FlushResult

Re-exports [FlushResult](../react/Internal/interfaces/FlushResult.md)

***

### generateConversationId

Re-exports [generateConversationId](../react/Internal/functions/generateConversationId.md)

***

### generateEmbedding

Re-exports [generateEmbedding](../react/Internal/functions/generateEmbedding.md)

***

### generateEmbeddings

Re-exports [generateEmbeddings](../react/Internal/functions/generateEmbeddings.md)

***

### getAllVaultFoldersOp

Re-exports [getAllVaultFoldersOp](../react/Internal/functions/getAllVaultFoldersOp.md)

***

### getAllVaultMemoriesOp

Re-exports [getAllVaultMemoriesOp](../react/Internal/functions/getAllVaultMemoriesOp.md)

***

### getAllVaultMemoryContentsOp

Re-exports [getAllVaultMemoryContentsOp](../react/Internal/functions/getAllVaultMemoryContentsOp.md)

***

### getCachedServerTools

Re-exports [getCachedServerTools](../react/Internal/functions/getCachedServerTools.md)

***

### getConversationsByProjectLazyOp

Re-exports [getConversationsByProjectLazyOp](../react/Internal/functions/getConversationsByProjectLazyOp.md)

***

### getConversationsLazyOp

Re-exports [getConversationsLazyOp](../react/Internal/functions/getConversationsLazyOp.md)

***

### getDecayCandidatesRawOp

Re-exports [getDecayCandidatesRawOp](../react/Internal/functions/getDecayCandidatesRawOp.md)

***

### getLogger

Re-exports [getLogger](../react/Internal/functions/getLogger.md)

***

### GetMessagesPageOptions

Re-exports [GetMessagesPageOptions](../react/Internal/interfaces/GetMessagesPageOptions.md)

***

### getServerTools

Re-exports [getServerTools](../react/Internal/functions/getServerTools.md)

***

### getUnfiledVaultMemoriesOp

Re-exports [getUnfiledVaultMemoriesOp](../react/Internal/functions/getUnfiledVaultMemoriesOp.md)

***

### getVaultFolderMemoryCountOp

Re-exports [getVaultFolderMemoryCountOp](../react/Internal/functions/getVaultFolderMemoryCountOp.md)

***

### getVaultMemoryOp

Re-exports [getVaultMemoryOp](../react/Internal/functions/getVaultMemoryOp.md)

***

### GraphTraversalOptions

Re-exports [GraphTraversalOptions](../react/Internal/interfaces/GraphTraversalOptions.md)

***

### HARD\_DELETE\_WINDOW\_MS

Re-exports [HARD\_DELETE\_WINDOW\_MS](../react/Internal/variables/HARD_DELETE_WINDOW_MS.md)

***

### hardDeleteDecayedOp

Re-exports [hardDeleteDecayedOp](../react/Internal/functions/hardDeleteDecayedOp.md)

***

### hasEncryptionKey

Re-exports [hasEncryptionKey](../react/Internal/functions/hasEncryptionKey.md)

***

### INFERENCE\_ID\_HEADER

Re-exports [INFERENCE\_ID\_HEADER](../react/Internal/variables/INFERENCE_ID_HEADER.md)

***

### InjectionReason

Re-exports [InjectionReason](../react/Internal/type-aliases/InjectionReason.md)

***

### injectionSignatureCatalog

Re-exports [injectionSignatureCatalog](../react/Internal/functions/injectionSignatureCatalog.md)

***

### LazyStoredConversation

Re-exports [LazyStoredConversation](../react/Internal/interfaces/LazyStoredConversation.md)

***

### Logger

Re-exports [Logger](../react/Internal/interfaces/Logger.md)

***

### LoggerProvider

Re-exports [LoggerProvider](../react/Internal/functions/LoggerProvider.md)

***

### LoggerProviderProps

Re-exports [LoggerProviderProps](../react/Internal/interfaces/LoggerProviderProps.md)

***

### MAX\_HOPS

Re-exports [MAX\_HOPS](../react/Internal/variables/MAX_HOPS.md)

***

### MEDIUM\_TTL\_MS

Re-exports [MEDIUM\_TTL\_MS](../react/Internal/variables/MEDIUM_TTL_MS.md)

***

### MemoryEngineEmbeddingOptions

Re-exports [MemoryEngineEmbeddingOptions](../react/Internal/interfaces/MemoryEngineEmbeddingOptions.md)

***

### MemoryEngineResult

Re-exports [MemoryEngineResult](../react/Internal/interfaces/MemoryEngineResult.md)

***

### MemoryEngineSearchOptions

Re-exports [MemoryEngineSearchOptions](../react/Internal/interfaces/MemoryEngineSearchOptions.md)

***

### MemoryExtractedEvent

Re-exports [MemoryExtractedEvent](../react/Internal/interfaces/MemoryExtractedEvent.md)

***

### MemoryKind

Re-exports [MemoryKind](../react/Internal/type-aliases/MemoryKind.md)

***

### MemoryQuarantinedEvent

Re-exports [MemoryQuarantinedEvent](../react/Internal/interfaces/MemoryQuarantinedEvent.md)

***

### MemoryVaultSearchOptions

Re-exports [MemoryVaultSearchOptions](../react/Internal/interfaces/MemoryVaultSearchOptions.md)

***

### MemoryVaultToolOptions

Re-exports [MemoryVaultToolOptions](../react/Internal/interfaces/MemoryVaultToolOptions.md)

***

### MessageSkeleton

Re-exports [MessageSkeleton](../react/Internal/interfaces/MessageSkeleton.md)

***

### moveMemoriesToFolderOp

Re-exports [moveMemoriesToFolderOp](../react/Internal/functions/moveMemoriesToFolderOp.md)

***

### NEVER\_TTL\_MS

Re-exports [NEVER\_TTL\_MS](../react/Internal/variables/NEVER_TTL_MS.md)

***

### NODE\_BUDGET

Re-exports [NODE\_BUDGET](../react/Internal/variables/NODE_BUDGET.md)

***

### noopLogger

Re-exports [noopLogger](../react/Internal/variables/noopLogger.md)

***

### NowSource

Re-exports [NowSource](../react/Internal/type-aliases/NowSource.md)

***

### onKeyAvailable

Re-exports [onKeyAvailable](../react/Internal/functions/onKeyAvailable.md)

***

### PAST\_EVENT\_GRACE\_MS

Re-exports [PAST\_EVENT\_GRACE\_MS](../react/Internal/variables/PAST_EVENT_GRACE_MS.md)

***

### PlatformStorage

Re-exports [PlatformStorage](../react/Internal/interfaces/PlatformStorage.md)

***

### PortalLlmAuth

Re-exports [PortalLlmAuth](../react/Internal/interfaces/PortalLlmAuth.md)

***

### preEmbedVaultMemories

Re-exports [preEmbedVaultMemories](../react/Internal/functions/preEmbedVaultMemories.md)

***

### PromptPreProcessor

Re-exports [PromptPreProcessor](../react/Internal/type-aliases/PromptPreProcessor.md)

***

### PromptPreProcessorContext

Re-exports [PromptPreProcessorContext](../react/Internal/type-aliases/PromptPreProcessorContext.md)

***

### QuantizedEmbedding

Re-exports [QuantizedEmbedding](../react/Internal/interfaces/QuantizedEmbedding.md)

***

### quantizeEmbedding

Re-exports [quantizeEmbedding](../react/Internal/functions/quantizeEmbedding.md)

***

### QuarantinedMemoryInfo

Re-exports [QuarantinedMemoryInfo](../react/Internal/interfaces/QuarantinedMemoryInfo.md)

***

### queueManager

Re-exports [queueManager](../react/Internal/variables/queueManager.md)

***

### QueueManager

Re-exports [QueueManager](../react/Internal/classes/QueueManager.md)

***

### QueueStatus

Re-exports [QueueStatus](../react/Internal/interfaces/QueueStatus.md)

***

### RankedMemory

Re-exports [RankedMemory](../react/Internal/interfaces/RankedMemory.md)

***

### recall

Re-exports [recall](../react/Internal/functions/recall.md)

***

### RECALL\_MAX\_LIMIT

Re-exports [RECALL\_MAX\_LIMIT](../react/Internal/variables/RECALL_MAX_LIMIT.md)

***

### RECALL\_TOOL\_NAME

Re-exports [RECALL\_TOOL\_NAME](../react/Internal/variables/RECALL_TOOL_NAME.md)

***

### RecallContext

Re-exports [RecallContext](../react/Internal/interfaces/RecallContext.md)

***

### RecallOptions

Re-exports [RecallOptions](../react/Internal/interfaces/RecallOptions.md)

***

### RecallResult

Re-exports [RecallResult](../react/Internal/interfaces/RecallResult.md)

***

### RecallToolCallbacks

Re-exports [RecallToolCallbacks](../react/Internal/interfaces/RecallToolCallbacks.md)

***

### RecallToolOptions

Re-exports [RecallToolOptions](../react/Internal/interfaces/RecallToolOptions.md)

***

### RecencyOptions

Re-exports [RecencyOptions](../react/Internal/interfaces/RecencyOptions.md)

***

### reflect

Re-exports [reflect](../react/Internal/functions/reflect.md)

***

### ReflectOptions

Re-exports [ReflectOptions](../react/Internal/interfaces/ReflectOptions.md)

***

### ReflectResult

Re-exports [ReflectResult](../react/Internal/interfaces/ReflectResult.md)

***

### requestEncryptionKey

Re-exports [requestEncryptionKey](../react/Internal/functions/requestEncryptionKey.md)

***

### restoreVaultMemoryOp

Re-exports [restoreVaultMemoryOp](../react/Internal/functions/restoreVaultMemoryOp.md)

***

### resumeStream

Re-exports [resumeStream](../react/Internal/functions/resumeStream.md)

***

### ResumeStreamOptions

Re-exports [ResumeStreamOptions](../react/Internal/interfaces/ResumeStreamOptions.md)

***

### ResumeStreamResult

Re-exports [ResumeStreamResult](../react/Internal/type-aliases/ResumeStreamResult.md)

***

### retain

Re-exports [retain](../react/Internal/functions/retain.md)

***

### RetainAction

Re-exports [RetainAction](../react/Internal/type-aliases/RetainAction.md)

***

### RetainContext

Re-exports [RetainContext](../react/Internal/interfaces/RetainContext.md)

***

### RetainOptions

Re-exports [RetainOptions](../react/Internal/interfaces/RetainOptions.md)

***

### RetainResult

Re-exports [RetainResult](../react/Internal/interfaces/RetainResult.md)

***

### RetainSource

Re-exports [RetainSource](../react/Internal/type-aliases/RetainSource.md)

***

### ScoreBreakdown

Re-exports [ScoreBreakdown](../react/Internal/interfaces/ScoreBreakdown.md)

***

### screenCandidatesForInjection

Re-exports [screenCandidatesForInjection](../react/Internal/functions/screenCandidatesForInjection.md)

***

### ScreenedCandidate

Re-exports [ScreenedCandidate](../react/Internal/interfaces/ScreenedCandidate.md)

***

### ScreenResult

Re-exports [ScreenResult](../react/Internal/interfaces/ScreenResult.md)

***

### SDK\_SCHEMA\_VERSION

Re-exports [SDK\_SCHEMA\_VERSION](../react/Internal/variables/SDK_SCHEMA_VERSION.md)

***

### sdkMigrations

Re-exports [sdkMigrations](../react/Internal/variables/sdkMigrations.md)

***

### sdkModelClasses

Re-exports [sdkModelClasses](../react/Internal/variables/sdkModelClasses.md)

***

### sdkSchema

Re-exports [sdkSchema](../react/Internal/variables/sdkSchema.md)

***

### SearchSource

Re-exports [SearchSource](../react/Internal/interfaces/SearchSource.md)

***

### searchVaultMemories

Re-exports [searchVaultMemories](../react/Internal/functions/searchVaultMemories.md)

***

### ServerToolsOptions

Re-exports [ServerToolsOptions](../react/Internal/interfaces/ServerToolsOptions.md)

***

### ServerToolsResponse

Re-exports [ServerToolsResponse](../react/Internal/type-aliases/ServerToolsResponse.md)

***

### setLogger

Re-exports [setLogger](../react/Internal/functions/setLogger.md)

***

### SHORT\_TTL\_MS

Re-exports [SHORT\_TTL\_MS](../react/Internal/variables/SHORT_TTL_MS.md)

***

### shouldChunkMessage

Re-exports [shouldChunkMessage](../react/Internal/functions/shouldChunkMessage.md)

***

### SignMessageFn

Re-exports [SignMessageFn](../react/Internal/type-aliases/SignMessageFn.md)

***

### StockPriceClassification

Re-exports [StockPriceClassification](../react/Internal/interfaces/StockPriceClassification.md)

***

### StockPricePreProcessorOptions

Re-exports [StockPricePreProcessorOptions](../react/Internal/interfaces/StockPricePreProcessorOptions.md)

***

### StoredChatCompletionUsage

Re-exports [StoredChatCompletionUsage](../react/Internal/interfaces/StoredChatCompletionUsage.md)

***

### StoredConversation

Re-exports [StoredConversation](../react/Internal/interfaces/StoredConversation.md)

***

### StoredMessage

Re-exports [StoredMessage](../react/Internal/interfaces/StoredMessage.md)

***

### StoredMessageWithSimilarity

Re-exports [StoredMessageWithSimilarity](../react/Internal/interfaces/StoredMessageWithSimilarity.md)

***

### StoredVaultFolder

Re-exports [StoredVaultFolder](../react/Internal/interfaces/StoredVaultFolder.md)

***

### StoredVaultFolderModel

Re-exports [StoredVaultFolderModel](../react/Internal/classes/StoredVaultFolderModel.md)

***

### StoredVaultMemory

Re-exports [StoredVaultMemory](../react/Internal/interfaces/StoredVaultMemory.md)

***

### StoredVaultMemoryModel

Re-exports [StoredVaultMemoryModel](../react/Internal/classes/StoredVaultMemoryModel.md)

***

### STREAM\_RESUMABLE\_HEADER

Re-exports [STREAM\_RESUMABLE\_HEADER](../react/Internal/variables/STREAM_RESUMABLE_HEADER.md)

***

### streamCancelPath

Re-exports [streamCancelPath](../react/Internal/functions/streamCancelPath.md)

***

### StreamExpiredError

Re-exports [StreamExpiredError](../react/Internal/classes/StreamExpiredError.md)

***

### StreamMetaEvent

Re-exports [StreamMetaEvent](../react/Internal/type-aliases/StreamMetaEvent.md)

***

### streamReplayPath

Re-exports [streamReplayPath](../react/Internal/functions/streamReplayPath.md)

***

### StreamResumeHandle

Re-exports [StreamResumeHandle](../react/Internal/type-aliases/StreamResumeHandle.md)

***

### TextChunk

Re-exports [TextChunk](../react/Internal/interfaces/TextChunk.md)

***

### traverseGraphLane

Re-exports [traverseGraphLane](../react/Internal/functions/traverseGraphLane.md)

***

### ttlForType

Re-exports [ttlForType](../react/Internal/functions/ttlForType.md)

***

### TurnCompleteEvent

Re-exports [TurnCompleteEvent](../react/Internal/interfaces/TurnCompleteEvent.md)

***

### TurnSkippedEvent

Re-exports [TurnSkippedEvent](../react/Internal/interfaces/TurnSkippedEvent.md)

***

### updateVaultFolderContextOp

Re-exports [updateVaultFolderContextOp](../react/Internal/functions/updateVaultFolderContextOp.md)

***

### updateVaultFolderOp

Re-exports [updateVaultFolderOp](../react/Internal/functions/updateVaultFolderOp.md)

***

### UpdateVaultFolderOptions

Re-exports [UpdateVaultFolderOptions](../react/Internal/interfaces/UpdateVaultFolderOptions.md)

***

### updateVaultMemoryEmbeddingOp

Re-exports [updateVaultMemoryEmbeddingOp](../react/Internal/functions/updateVaultMemoryEmbeddingOp.md)

***

### updateVaultMemoryOp

Re-exports [updateVaultMemoryOp](../react/Internal/functions/updateVaultMemoryOp.md)

***

### UpdateVaultMemoryOptions

Re-exports [UpdateVaultMemoryOptions](../react/Internal/interfaces/UpdateVaultMemoryOptions.md)

***

### useCredits

Re-exports [useCredits](../react/Hooks/useCredits.md)

***

### UseCreditsOptions

Re-exports [UseCreditsOptions](../react/Internal/type-aliases/UseCreditsOptions.md)

***

### UseCreditsResult

Re-exports [UseCreditsResult](../react/Internal/type-aliases/UseCreditsResult.md)

***

### useEncryption

Re-exports [useEncryption](../react/Hooks/useEncryption.md)

***

### useModels

Re-exports [useModels](../react/Hooks/useModels.md)

***

### UseModelsResult

Re-exports [UseModelsResult](../react/Internal/type-aliases/UseModelsResult.md)

***

### VAULT\_SIZE\_HOP\_CAP

Re-exports [VAULT\_SIZE\_HOP\_CAP](../react/Internal/variables/VAULT_SIZE_HOP_CAP.md)

***

### VaultEmbeddingCache

Re-exports [VaultEmbeddingCache](../react/Internal/type-aliases/VaultEmbeddingCache.md)

***

### VaultFolderOperationsContext

Re-exports [VaultFolderOperationsContext](../react/Internal/interfaces/VaultFolderOperationsContext.md)

***

### VaultMemoryOperationsContext

Re-exports [VaultMemoryOperationsContext](../react/Internal/interfaces/VaultMemoryOperationsContext.md)

***

### VaultSaveOperation

Re-exports [VaultSaveOperation](../react/Internal/interfaces/VaultSaveOperation.md)

***

### VaultSearchResult

Re-exports [VaultSearchResult](../react/Internal/interfaces/VaultSearchResult.md)

***

### WalletPoller

Re-exports [WalletPoller](../react/Internal/classes/WalletPoller.md)

***

### WeatherClassification

Re-exports [WeatherClassification](../react/Internal/interfaces/WeatherClassification.md)

***

### WeatherPreProcessorOptions

Re-exports [WeatherPreProcessorOptions](../react/Internal/interfaces/WeatherPreProcessorOptions.md)

***

### WebSearchClassification

Re-exports [WebSearchClassification](../react/Internal/interfaces/WebSearchClassification.md)

***

### WebSearchPreProcessorOptions

Re-exports [WebSearchPreProcessorOptions](../react/Internal/interfaces/WebSearchPreProcessorOptions.md)
