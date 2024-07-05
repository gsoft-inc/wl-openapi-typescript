import { describe, test, vi } from "vitest";
import { toFullyQualifiedURL } from "../src/utils.ts";

describe.concurrent("utils", () => {
    describe.concurrent(toFullyQualifiedURL.name, () => {
        test("input as HTTP URL as URL", ({ expect }) => {
            const input = new URL("https://example.com/input");

            const result = toFullyQualifiedURL(input);

            expect(result).toBe("https://example.com/input");
        });

        test("input as HTTP URL as text", ({ expect }) => {
            const input = "https://example.com/input";

            const result = toFullyQualifiedURL(input);

            expect(result).toBe("https://example.com/input");
        });

        test("input as file URL as URL", ({ expect }) => {
            const input = new URL("file:///C:/input");
            const result = toFullyQualifiedURL(input);
            expect(result).toBe("file:///C:/input");
        });

        test("input as file URL as text", ({ expect }) => {
            const input = "file:///C:/input";

            const result = toFullyQualifiedURL(input);

            expect(result).toBe("file:///C:/input");
        });

        test("input as absolute path", ({ expect }) => {
            const input = "/input";

            const result = toFullyQualifiedURL(input);

            expect(result).toBe("file:///C:/input");
        });

        test("input as relative path", ({ expect, onTestFinished }) => {
            vi.spyOn(process, "cwd").mockImplementation(() => "/cwd");
            onTestFinished(() => {
                vi.resetAllMocks();
            });

            // Bare
            let input = "input";
            let result = toFullyQualifiedURL(input);
            expect(result).toBe("file:///cwd/input");

            // dot slash
            input = "./input";
            result = toFullyQualifiedURL(input);
            expect(result).toBe("file:///cwd/input");

            // parent dir
            input = "../input";
            result = toFullyQualifiedURL(input);
            expect(result).toBe("file:///input");
        });

        test("input as relative, root as HTTP URL as URL", ({ expect }) => {
            const input = "input";
            const root = new URL("https://example.com/root");

            const result = toFullyQualifiedURL(input, root);

            expect(result).toBe("https://example.com/root/input");
        });

        test("input as relative, root as HTTP URL as text", ({ expect }) => {
            const input = "input";
            const root = "https://example.com/root";

            const result = toFullyQualifiedURL(input, root);

            expect(result).toBe("https://example.com/root/input");
        });

        test("input as relative, root as file URL as URL", ({ expect }) => {
            const input = "input";
            const root = new URL("file:///C:/root");

            const result = toFullyQualifiedURL(input, root);

            expect(result).toBe("file:///C:/root/input");
        });

        test("input as relative, root as file URL as text", ({ expect }) => {
            const input = "input";
            const root = "file:///C:/root";

            const result = toFullyQualifiedURL(input, root);

            expect(result).toBe("file:///C:/root/input");
        });

        test("input as relative, root as absolute path", ({ expect }) => {
            const input = "input";
            const root = "C:/root";

            const result = toFullyQualifiedURL(input, root);

            expect(result).toBe("file:///C:/root/input");
        });

        test("input as relative, root as relative", ({
            expect,
            onTestFinished,
        }) => {
            vi.spyOn(process, "cwd").mockImplementation(() => "C:/cwd");
            onTestFinished(() => {
                vi.resetAllMocks();
            });

            const input = "input";
            const root = "root";

            const result = toFullyQualifiedURL(input, root);

            expect(result).toBe("file:///C:/cwd/root/input");
        });
    });
});
