import { buildURL, serializeBody, mergeHeaders, type SerializeQueryOptions } from "./base-client-internals.ts";

export type TypedResponse<T> = Omit<Response, "json"> & {
    json: () => Promise<T>;
};

export type Result<D, E> = Ok<D> | Err<E>;

export type Ok<T> = [TypedResponse<T>, undefined];

export type Err<T> = [undefined, TypedResponse<T> | Error];

export interface BaseClientOptions {
    baseURL?: string;
    headers?: HeadersInit;
    query?: SerializeQueryOptions;
}

interface BaseClientInit {
    path?: Record<string, unknown> | undefined;
    query?: Record<string, unknown> | undefined;
    headers?: Record<string, unknown> | undefined;
    body?: unknown | undefined;
    request?: RequestInit ;
}

export interface Middleware {
    onRequest?: (request: Request) => undefined | Request | Promise<undefined | Request>;
    onResponse?: (response: Response) => undefined | Response | Promise<undefined | Response>;
    onError?: (error: unknown) => void;
}

export class BaseClient {
    #options: BaseClientOptions;
    #middlewares: Middleware[] = [];

    constructor(options: BaseClientOptions = {}) {
        this.#options = options;
    }

    use(...middlewares: Middleware[]) {
        this.#middlewares.push(...middlewares);
    }

    unuse(...middlewares: Middleware[]) {
        this.#middlewares = this.#middlewares.filter(middleware => !middlewares.includes(middleware));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async fetch(method: string, url: string, init: BaseClientInit = {}, requestContentType?: string): Promise<Result<any, any>> {
        let request = new Request(
            buildURL(url, init.path, init.query, this.#options.query, this.#options.baseURL),
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

        try {
            for (const middleware of this.#middlewares) {
                if (middleware.onRequest) {
                    const result = await middleware.onRequest(request);
                    if (result instanceof Request) {
                        request = result;
                    }
                }
            }

            let response = await fetch(request);

            for (const middleware of this.#middlewares) {
                if (middleware.onResponse) {
                    const result = await middleware.onResponse(response);
                    if (result instanceof Response) {
                        response = result;
                    }
                }
            }

            if (response.ok) {
                return [response, undefined];
            } else {
                return [undefined, response];
            }
        } catch (error) {
            for (const middleware of this.#middlewares) {
                if (middleware.onError) {
                    middleware.onError(error);
                }
            }

            return [undefined, error as Error];
        }
    }
}