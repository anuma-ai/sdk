/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { github_com_zeta_chain_ai_portal_pkg_llmapi_ChatCompletionRequest } from '../models/github_com_zeta_chain_ai_portal_pkg_llmapi_ChatCompletionRequest';
import type { github_com_zeta_chain_ai_portal_pkg_llmapi_ChatCompletionResponse } from '../models/github_com_zeta_chain_ai_portal_pkg_llmapi_ChatCompletionResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ChatService {
    /**
     * Create chat completion
     * Generates a chat completion using the configured gateway.
     * @param requestBody Chat completion request
     * @returns github_com_zeta_chain_ai_portal_pkg_llmapi_ChatCompletionResponse OK
     * @throws ApiError
     */
    public static postApiV1ChatCompletions(
        requestBody: github_com_zeta_chain_ai_portal_pkg_llmapi_ChatCompletionRequest,
    ): CancelablePromise<github_com_zeta_chain_ai_portal_pkg_llmapi_ChatCompletionResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/chat/completions',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
}
