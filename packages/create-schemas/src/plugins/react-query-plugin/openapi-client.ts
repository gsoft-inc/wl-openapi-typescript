import { buildURL, serializeBody, mergeHeaders, type SerializeQueryOptions } from "./openapi-client-helpers.ts";

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
    onRequest?: (request: Request) => void | Request | Promise<void | Request>;
    onResponse?: (response: Response) => void | Response | Promise<void | Response>;
    onError?: (error: unknown) => void;
    request?: RequestInit;
}

export class OpenAPIClient {
    #options: OpenAPIClientOptions;
    #middlewares: Middleware[] = [];

    constructor(options: OpenAPIClientOptions = {}) {
        this.#options = options;
    }

    addMiddleware(middleware: Middleware, options: { signal?: AbortSignal } = {}): void {
        this.#middlewares.push(middleware);

        if (options.signal) {
            options.signal.addEventListener("abort", () => {
                this.#middlewares = this.#middlewares.filter(m => m !== middleware);
            }, { once: true });
        }
    }

    removeMiddleware(middleware: Middleware): void {
        this.#middlewares = this.#middlewares.filter(m => m !== middleware);
    }

    async [internal_fetch](method: string, path: string, init: OpenAPIClientInit = {}, requestContentType?: string) {
        try {
            let request = new Request(
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

            for (const middleware of this.#middlewares) {
                if (middleware.onRequest) {
                    const result = await middleware.onRequest(request);
                    if (result) {
                        request = result;
                    }
                }
            }

            let response = await fetch(request);

            for (const middleware of this.#middlewares) {
                if (middleware.onResponse) {
                    const result = await middleware.onResponse(response);
                    if (result) {
                        response = result;
                    }
                }
            }

            const buffer = await response.clone().arrayBuffer();
            if (buffer.byteLength > 0) {
                if (response.ok) {
                    return response.json();
                } else {
                    throw await response.json();
                }
            } else {
                if (response.ok) {
                    return undefined;
                } else {
                    throw new Error(response.statusText);
                }
            }
        } catch (error) {
            for (const middleware of this.#middlewares) {
                if (middleware.onError) {
                    middleware.onError(error);
                }
            }

            throw error;
        }
    }
}