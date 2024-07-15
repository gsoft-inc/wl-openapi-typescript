import { assert, describe, test } from "vitest";
import { generate } from "../src/generate.ts";
import { resolveConfig } from "../src/config.ts";
import { join } from "path";
import { dataFolder } from "./fixtures.ts";

describe.concurrent("generate", () => {
    test("sanitize names", async ({ expect }) => {
        const { files } = await generate(await resolveConfig({
            input: join(dataFolder, "field-names.json")
        }));

        const typesFile = files.find(file => file.filename === "types.ts");

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
});
