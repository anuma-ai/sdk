/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { internal_api_handlers_HealthResponse } from '../models/internal_api_handlers_HealthResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HealthService {
    /**
     * Health check
     * Returns the current health status of the service.
     * @returns internal_api_handlers_HealthResponse OK
     * @throws ApiError
     */
    public static getHealth(): CancelablePromise<internal_api_handlers_HealthResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health',
            errors: {
                500: `Internal Server Error`,
            },
        });
    }
}
