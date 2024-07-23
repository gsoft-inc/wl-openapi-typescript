export const code = `
export interface WorkleapClientInit {
    request?: RequestInit;
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
    async fetch(url: string, init: WorkleapClientInit = {}): Promise<WorkleapClientResponse<any, any>> {
        const requestInit = init.request ?? {};
        
        let parsedUrl = url;
        if ("path" in init) {
            const path = init.path;
            for (const key in path) {
                parsedUrl = url.replace(\`{\${key}}\`, path[key].toString());
            }
        }

        const request = new Request(parsedUrl, {
            body: init.body ? JSON.stringify(init.body) : undefined,
            ...requestInit,
            headers: {
                "Content-Type": "application/json",
                ...requestInit.headers
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