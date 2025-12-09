"use client";

import { useCallback, useRef, useState } from "react";
import {
  pipeline,
  type TextClassificationPipeline,
} from "@huggingface/transformers";

export type ModerationResult = {
  label: string;
  score: number;
};

export type UseModerationOptions = {
  /**
   * The model to use for toxicity classification.
   * @default "Xenova/toxic-bert"
   */
  model?: string;
};

export type UseModerationResult = {
  /**
   * Whether the model is currently loading.
   */
  isLoading: boolean;
  /**
   * Whether the model has been loaded and is ready for classification.
   */
  isReady: boolean;
  /**
   * Any error that occurred during loading or classification.
   */
  error: Error | null;
  /**
   * Load the moderation model. Called automatically on first classify() call if not already loaded.
   */
  loadModel: () => Promise<void>;
  /**
   * Classify text for toxicity.
   * @param text - The text to classify.
   * @returns The classification result with label and score.
   */
  classify: (text: string) => Promise<ModerationResult | null>;
};

const DEFAULT_MODEL = "Xenova/toxic-bert";

/**
 * React hook for text moderation using a toxicity classifier.
 * Uses a local model for client-side toxicity detection.
 */
export function useModeration(
  options: UseModerationOptions = {}
): UseModerationResult {
  const { model = DEFAULT_MODEL } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const classifierRef = useRef<TextClassificationPipeline | null>(null);
  const loadingPromiseRef = useRef<Promise<void> | null>(null);

  const loadModel = useCallback(async () => {
    // If already loaded, do nothing
    if (classifierRef.current) {
      return;
    }

    // If currently loading, wait for the existing promise
    if (loadingPromiseRef.current) {
      return loadingPromiseRef.current;
    }

    setIsLoading(true);
    setError(null);

    const loadPromise = (async () => {
      try {
        const classifier = await pipeline("text-classification", model);
        classifierRef.current = classifier as TextClassificationPipeline;
        setIsReady(true);
      } catch (err) {
        const processedError =
          err instanceof Error ? err : new Error(String(err));
        setError(processedError);
        throw processedError;
      } finally {
        setIsLoading(false);
        loadingPromiseRef.current = null;
      }
    })();

    loadingPromiseRef.current = loadPromise;
    return loadPromise;
  }, [model]);

  const classify = useCallback(
    async (text: string): Promise<ModerationResult | null> => {
      setError(null);

      try {
        // Load model if not already loaded
        if (!classifierRef.current) {
          await loadModel();
        }

        if (!classifierRef.current) {
          throw new Error("Failed to load moderation model");
        }

        const result = await classifierRef.current(text);

        // The pipeline returns an array of results, which may be nested
        if (Array.isArray(result) && result.length > 0) {
          const firstResult = result[0];
          // Handle nested array case (TextClassificationOutput)
          if (Array.isArray(firstResult) && firstResult.length > 0) {
            return {
              label: firstResult[0].label,
              score: firstResult[0].score,
            };
          }
          // Handle single result case (TextClassificationSingle)
          if ("label" in firstResult && "score" in firstResult) {
            return {
              label: firstResult.label,
              score: firstResult.score,
            };
          }
        }

        return null;
      } catch (err) {
        const processedError =
          err instanceof Error ? err : new Error(String(err));
        setError(processedError);
        throw processedError;
      }
    },
    [loadModel]
  );

  return {
    isLoading,
    isReady,
    error,
    loadModel,
    classify,
  };
}
