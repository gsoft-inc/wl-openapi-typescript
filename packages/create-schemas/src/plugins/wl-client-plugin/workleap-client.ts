export const code = `
export interface WorkleapClientInit {
    request?: RequestInit;
}

export type Result<D, E> = Ok<D> | Err<E>;

export interface Ok<T> {
    data: T;
    error: undefined;
    response: Response;
}

export type Err<T> = {
    data: undefined;
    error: T;
    response: Response;
} | {
    data: undefined;
    error: Error;
    response: undefined;
};

export class WorkleapClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async fetch(url: string, init: any = {}): Promise<Result<any, any>> {
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