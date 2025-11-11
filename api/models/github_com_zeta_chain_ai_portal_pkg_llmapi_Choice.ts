/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { github_com_zeta_chain_ai_portal_pkg_llmapi_Message } from './github_com_zeta_chain_ai_portal_pkg_llmapi_Message';
export type github_com_zeta_chain_ai_portal_pkg_llmapi_Choice = {
    /**
     * FinishReason indicates why the completion stopped
     */
    finish_reason?: string;
    /**
     * Index is the choice index
     */
    index?: number;
    message?: github_com_zeta_chain_ai_portal_pkg_llmapi_Message;
};

