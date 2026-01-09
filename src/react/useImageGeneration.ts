"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postApiV1ImagesGenerations } from "../client/sdk.gen";
import { BASE_URL } from "../clientConfig";
import type {
  LlmapiImageGenerationRequest,
  LlmapiImageGenerationResponse,
} from "../client";

/**
 * @inline
 */
export type UseImageGenerationOptions = {
  /**
   * Custom function to get auth token for API calls
   */
  getToken?: () => Promise<string | null>;
  /**
   * Optional base URL for the API requests.
   */
  baseUrl?: string;
  /**
   * Callback function to be called when the generation finishes successfully.
   */
  onFinish?: (response: LlmapiImageGenerationResponse) => void;
  /**
   * Callback function to be called when an unexpected error is encountered.
   */
  onError?: (error: Error) => void;
};

export type GenerateImageArgs = LlmapiImageGenerationRequest;

export type GenerateImageResult =
  | { data: LlmapiImageGenerationResponse; error: null }
  | { data: null; error: string };

export type UseImageGenerationResult = {
  isLoading: boolean;
  generateImage: (args: GenerateImageArgs) => Promise<GenerateImageResult>;
  stop: () => void;
};

/**
 * React hook for generating images using the LLM API.
 * @category Hooks
 */
export function useImageGeneration(
  options: UseImageGenerationOptions = {}
): UseImageGenerationResult {
  const { getToken, baseUrl = BASE_URL, onFinish, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const generateImage = useCallback(
    async (args: GenerateImageArgs): Promise<GenerateImageResult> => {
      // Abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);

      try {
        if (!getToken) {
          throw new Error("Token getter function is required.");
        }

        const token = await getToken();

        if (!token) {
          throw new Error("No access token available.");
        }

        const response = await postApiV1ImagesGenerations({
          baseUrl,
          body: args,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: abortController.signal,
        });

        if (response.error) {
          const errorMsg =
            response.error.error || "Failed to generate image";
          throw new Error(errorMsg);
        }

        if (!response.data) {
          throw new Error("No data received from image generation API");
        }

        const result = response.data;

        if (onFinish) {
          onFinish(result);
        }

        return { data: result, error: null };
      } catch (err) {
        // Handle AbortError specifically
        if (err instanceof Error && err.name === "AbortError") {
          return { data: null, error: "Request aborted" };
        }

        const errorMsg =
          err instanceof Error ? err.message : "Failed to generate image.";
        const errorObj = err instanceof Error ? err : new Error(errorMsg);

        if (onError) {
          onError(errorObj);
        }

        return { data: null, error: errorMsg };
      } finally {
        if (abortControllerRef.current === abortController) {
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      }
    },
    [getToken, baseUrl, onFinish, onError]
  );

  return {
    isLoading,
    generateImage,
    stop,
  };
}

