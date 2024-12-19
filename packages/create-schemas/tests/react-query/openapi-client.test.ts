import { OpenAPIClient, internal_fetch } from "../../src/plugins/react-query-plugin/openapi-client.ts";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

describe("OpenAPIClient", () => {
    const server = setupServer();

    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    test("simple GET request", async () => {
        server.use(http.get("https://example.localhost/hello-world", () => HttpResponse.json({ message: "Hello, World!" })));

        const client = new OpenAPIClient();

        const result = await client[internal_fetch]("GET", "https://example.localhost/hello-world");

        expect(result).toEqual({ message: "Hello, World!" });
    });

    test("supports empty bodies", async () => {
        server.use(http.get("https://example.localhost/empty", () => HttpResponse.arrayBuffer()));

        const client = new OpenAPIClient();

        const result = await client[internal_fetch]("GET", "https://example.localhost/empty");

        expect(result).toBeUndefined();
    });

    test("supports baseURL", async () => {
        server.use(http.get("https://example.localhost/hello-world", () => HttpResponse.json({ ok: true })));

        const client = new OpenAPIClient({ baseURL: "https://example.localhost" });

        const result = await client[internal_fetch]("GET", "/hello-world");

        expect(result.ok).toBeTruthy();
    });

    test("supports simple search params", async () => {
        server.use(http.get("https://example.localhost/hello-world", ({ request }) => {
            const url = new URL(request.url);

            expect(url.searchParams.get("name")).toBe("John Doe");

            return HttpResponse.json({ ok: true });
        }));

        const client = new OpenAPIClient();

        const result = await client[internal_fetch]("GET", "https://example.localhost/hello-world", { query: { name: "John Doe" } });

        expect(result.ok).toBeTruthy();
    });

    test("supports exploding search params", async () => {
        server.use(http.get("https://example.localhost/hello-world", ({ request }) => {
            const url = new URL(request.url);

            expect(url.searchParams.getAll("users")).toEqual(["John", "Jack"]);

            return HttpResponse.json({ ok: true });
        }));

        const client = new OpenAPIClient();

        const result = await client[internal_fetch]("GET", "https://example.localhost/hello-world", { query: { users: ["John", "Jack"] } });

        expect(result.ok).toBeTruthy();
    });

    test("middleware can intercept request", async () => {
        server.use(http.get("https://example.localhost/throw", () => {
            return HttpResponse.json({ message: "Uh oh!" }, { status: 500 });
        }));

        const client = new OpenAPIClient();

        let count = 0;
        client.addMiddleware({
            onRequest: request => {
                count += 1;
                expect(request.method).toBe("GET");
            },
            onResponse: response => {
                count += 1;
                expect(response.status).toBe(500);
            },
            onError: error => {
                count += 1;
                expect(error).toEqual({ message: "Uh oh!" });
            }
        });

        try {
            await client[internal_fetch]("GET", "https://example.localhost/throw");
        } catch (error) {
            expect(error).toEqual({ message: "Uh oh!" });
            expect(count).toBe(3);
        }
    });

    test("middleware can modify request", async () => {
        server.use(http.get("https://example.localhost/test", ({ request }) => {
            expect(request.headers.get("Authorization")).toBe("Bearer token");

            return HttpResponse.json({ ok: true });
        }));

        const client = new OpenAPIClient();

        client.addMiddleware({
            onRequest: request => {
                request.headers.set("Authorization", "Bearer token");
                
                return request;
            }
        });

        await client[internal_fetch]("GET", "https://example.localhost/test");
    });

    test("supports POST request with body", async () => {
        const user = { name: "John Doe" };

        server.use(http.post("https://example.localhost/user", async ({ request }) => {
            expect(request.headers.get("Content-Type")).toBe("application/json");

            const data = await request.json() as typeof user;

            expect(data).toEqual({ name: "John Doe" });

            return HttpResponse.json({ message: "User created" });
        }));

        const client = new OpenAPIClient();

        const result = await client[internal_fetch]("POST", "https://example.localhost/user", { body: user }, "application/json");

        expect(result).toEqual({ message: "User created" });
    });

    
    test("throws on 400 and 500", async () => {
        server.use(http.get("https://example.localhost/400", () => HttpResponse.json({ message: "Bad request" }, { status: 400 })));
        server.use(http.get("https://example.localhost/500", () => HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })));

        const client = new OpenAPIClient();

        let count = 0;
        try {
            await client[internal_fetch]("GET", "https://example.localhost/400");
        } catch (error) {
            count += 1;
            expect(error).toEqual({ message: "Bad request" });
        }

        expect(count).toBe(1);

        try {
            await client[internal_fetch]("GET", "https://example.localhost/500");
        } catch (error) {
            count += 1;
            expect(error).toEqual({ message: "Internal Server Error" });
        }

        expect(count).toBe(2);
    });

    test("can be aborted with an abort signal", async () => {
        server.use(http.get("https://example.localhost/slow", () => new Promise(resolve => setTimeout(() => resolve(HttpResponse.json({ ok: true })), 1000))));
        const client = new OpenAPIClient();

        let threw = false;
        try {
            await client[internal_fetch]("GET", "https://example.localhost/slow", { request: { signal: AbortSignal.timeout(0) } });
        } catch (error) {
            threw = true;
            expect(error).toBeInstanceOf(DOMException);
        }
        expect(threw).toBeTruthy();
    });
});
