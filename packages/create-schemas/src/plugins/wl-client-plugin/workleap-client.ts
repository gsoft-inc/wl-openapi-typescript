export const code = `
export interface WorkleapClientInit extends RequestInit {
    body?: any;
    path?: Record<string, string | number>;
}

export interface WorkleapClientResponseData<T> {
    data: T;
    error: undefined;
    response: Response;
}

export interface WorkleapClientResponseError<T> {
    data: undefined;
    error: T;
    response: Response;
}

export type WorkleapClientResponse<D, E> = WorkleapClientResponseData<D> | WorkleapClientResponseError<E>;


export class WorkleapClient {
    async fetch(url: string, init: WorkleapClientInit): Promise<WorkleapClientResponse<any, any>> {
        if ("body" in init) {
            if (typeof init.body === "object") {
                init.body = JSON.stringify(init.body);
            }
        }
        
        if ("path" in init) {
            const path = init.path;
            for (const key in path) {
                url = url.replace(\`{\${key}}\`, path[key].toString());
            }
        }

        const request = new Request(url, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                ...init.headers
            }
        });

        const response = await fetch(request);

        if (response.ok) {
            return {
                data: await response.clone().json(),
                error: undefined,
                response
            };
        } else {
            return {
                data: undefined,
                error: await response.clone().json(),
                response
            };
        }
    }
}`;