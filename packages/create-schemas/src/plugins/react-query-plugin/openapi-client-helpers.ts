
export interface SerializeQueryOptions {
    style?: "form" | "spaceDelimited" | "pipeDelimited" | "deepObject";
    explode?: boolean;
}

/** Ref: https://swagger.io/docs/specification/serialization/#query */
export function serializeQuery(query: Record<string, unknown>, options: SerializeQueryOptions = {}) {
    const { style = "form", explode = true } = options;
    const searchParams = new Set<{ key: string; value: string }>();
    for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
            if (explode) {
                for (const item of value) {
                    searchParams.add({ key, value: item.toString() });
                }
            } else {
                if (style === "form") {
                    searchParams.add({ key, value: value.join(",") });
                } else if (style === "spaceDelimited") {
                    searchParams.add({ key, value: value.join("%20") });
                } else if (style === "pipeDelimited") {
                    searchParams.add({ key, value: value.join("|") });
                }
            }
            continue;
        }

        if (typeof value === "object" && value !== null) {
            if (style === "form") {
                if (explode) {
                    for (const [subKey, subValue] of Object.entries(value)) {
                        searchParams.add({ key: subKey, value: subValue });
                    }
                } else {
                    searchParams.add({ key, value: Object.entries(value).flatMap(([subKey, subValue]) => [subKey, subValue]).join(",") });
                }
            } else if (style === "deepObject") {
                if (explode) {
                    for (const [subKey, subValue] of Object.entries(value)) {
                        searchParams.add({ key: `${key}[${subKey}]`, value: subValue });
                    }
                }
            }
            continue;
        }

        searchParams.add({ key, value: String(value) });
    }

    return [...searchParams.entries()]
        .map(([{ key, value }]) => `${key}=${value}`)
        .join("&");
}

export function buildURL(path: string, pathParam: Record<string, unknown> | undefined, queryParam: Record<string, unknown> | undefined, serializeQueryOptions?: SerializeQueryOptions, baseURL = ""): string {
    const sanitizedBaseURL = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
    let url = sanitizedBaseURL + path;

    if (pathParam) {
        for (const key in pathParam) {
            url = url.replace(`{${key}}`, pathParam[key] as string);
        }
    }

    if (queryParam) {
        const query = serializeQuery(queryParam, serializeQueryOptions);
        url = `${url}?${query}`;
    }

    return url;
}

export function mergeHeaders(...headersInit: (HeadersInit | undefined)[]): Headers {
    const headers = new Headers();
    for (const init of headersInit) {
        if (init === undefined) {
            continue;
        }
        if (init instanceof Headers) {
            for (const [key, value] of init.entries()) {
                headers.set(key, value);
            }
        } else if (Array.isArray(init)) {
            for (const [key, value] of init) {
                headers.set(key, value);
            }
        } else if (typeof init === "object" && init !== null) {
            for (const [key, value] of Object.entries(init)) {
                headers.set(key, value as string);
            }
        }
    }

    return headers;
}

export function serializeBody(body: unknown, mediaType: string | undefined): BodyInit | undefined {
    if (body === undefined) {
        return undefined;
    }

    if (mediaType === "application/json") {
        return JSON.stringify(body);
    }

    if (mediaType === "multipart/form-data") {
        if (body instanceof FormData) {
            return body;
        }

        if (typeof body === "object" && body !== null) {
            const form = new FormData();
            for (const [key, value] of Object.entries(body)) {
                form.set(key, value);
            }

            return form;
        }
    }

    return undefined;
}