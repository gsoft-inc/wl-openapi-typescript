import { assert, describe, test } from "vitest";
import { generate } from "../src/generate.ts";
import { resolveConfig } from "../src/config.ts";
import { join } from "path";
import { dataFolder } from "./fixtures.ts";
import { openapiTypeScriptFilename } from "../src/plugins/openapi-typescript-plugin.ts";
import { experimental_openapiFetchPlugin } from "../src/plugins/openapi-fetch-plugin.ts";

describe.concurrent("generate", () => {
    test("sanitize names", async ({ expect }) => {
        const { files } = await generate(await resolveConfig({
            input: join(dataFolder, "field-names.json")
        }));

        const typesFile = files.find(file => file.filename === openapiTypeScriptFilename);

        assert(typesFile);

        expect(typesFile.code).toMatch("export type User");
        expect(typesFile.code).toMatch("export type User_1");
        expect(typesFile.code).toMatch("export type User_Name");
        expect(typesFile.code).toMatch("export type username");
        expect(typesFile.code).toMatch("export type myorgUser");
    });

    test("reject ambiguous names", async ({ expect }) => {
        const fn = async () => {
            await generate(await resolveConfig({
                input: join(dataFolder, "ambiguous-name.json")
            }));
        };

        expect(fn).rejects.toThrow();
    });

    test("reject invalid names", async ({ expect }) => {
        const fn = async () => {
            await generate(await resolveConfig({
                input: join(dataFolder, "invalid-name.json")
            }));
        };

        expect(fn).rejects.toThrow();
    });

    test("generate client", async ({ expect }) => {
        const { files } = await generate(await resolveConfig({
            input: join(dataFolder, "todo.json"),
            plugins: [experimental_openapiFetchPlugin()]
        }));

        const clientFile = files.find(file => file.filename === "client.ts");
        expect(clientFile).toBeDefined();
    });
});
