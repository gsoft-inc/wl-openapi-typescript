import { buildURL, serializeBody, mergeHeaders, type SerializeQueryOptions } from "./base-client-internals.ts";

interface OpenAPIClientOptions {
    baseURL?: string;
    query?: SerializeQueryOptions;
    headers?: Record<string, string>;
}

export const internal_fetch = Symbol();

interface OpenAPIClientInit {
    path?: Record<string, unknown> | undefined;
    query?: Record<string, unknown> | undefined;
    headers?: Record<string, unknown> | undefined;
    body?: unknown;
    request?: RequestInit ;
}

export interface Middleware {
    onRequest?: (request: Request) => undefined | Request | Promise<undefined | Request>;
    onResponse?: (response: Response) => undefined | Response | Promise<undefined | Response>;
    onError?: (error: unknown) => void;
    request?: RequestInit;
}

export class OpenAPIClient {
    #options: OpenAPIClientOptions;
    constructor(options: OpenAPIClientOptions = {}) {
        this.#options = options;
    }

    async [internal_fetch](method: string, path: string, init: OpenAPIClientInit = {}, requestContentType?: string) {
        const response = await fetch(
            buildURL(path, init.path, init.query, this.#options.query, this.#options.baseURL),
            {
                method,
                body: serializeBody(init.body, requestContentType),
                ...init.request,
                headers: mergeHeaders(
                    requestContentType ? { "Content-Type": requestContentType } : undefined,
                    this.#options.headers,
                    init.headers as HeadersInit,
                    init.request?.headers
                )
            }
        );

        if (response.ok) {
            return response.json();
        } else {
            throw await response.json();
        }
    }
}