/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { github_com_zeta_chain_ai_portal_pkg_llmapi_Message } from './github_com_zeta_chain_ai_portal_pkg_llmapi_Message';
export type github_com_zeta_chain_ai_portal_pkg_llmapi_ChatCompletionRequest = {
    /**
     * Messages is the conversation history
     */
    messages?: Array<github_com_zeta_chain_ai_portal_pkg_llmapi_Message>;
    /**
     * Model is the model identifier
     */
    model?: string;
    /**
     * Stream indicates if response should be streamed
     */
    stream?: boolean;
};

