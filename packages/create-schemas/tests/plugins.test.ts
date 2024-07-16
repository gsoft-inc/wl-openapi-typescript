
import { assert, describe, expect, test } from "vitest";
import { headerPlugin } from "../src/plugins/header-plugin.ts";
import { typesPlugin } from "../src/plugins/types-plugin.ts";
import { openapiTypeScriptId, openapiTypeScriptFilename } from "../src/plugins/openapi-typescript-plugin.ts";
import { resolveConfig } from "../src/config.ts";

describe.concurrent("plugins", () => {
    test("headerPlugin", async() => {
        const plugin = headerPlugin({ header: "This is a header" });

        assert(plugin.transform);
        
        const result = await plugin.transform({
            config: await resolveConfig({ input: "openapi.json" }),
            id: openapiTypeScriptId,
            code: "function foo() {}",
            filename: openapiTypeScriptFilename,
            emitFile: () => void 0
        });

        assert(result);

        expect(result.code).toMatchInlineSnapshot(`
          "/** This is a header */
          function foo() {}"
        `);
    });

    test("typesPlugin", async() => {
        const plugin = typesPlugin();

        assert(plugin.transform);
      
        const result = await plugin.transform({
            config: await resolveConfig({ input: "openapi.json" }),
            id: openapiTypeScriptId,
            code: `export interface components {
              schemas: {
                User: string;
                User_1: string;
                User_Name: string;
                "user-name": string;
                "my.org.User": string;
              }
            }`,
            filename: openapiTypeScriptFilename,
            emitFile: () => void 0
        });

        assert(result);

        expect(result.code).toMatchInlineSnapshot(`
          "export interface components {
                        schemas: {
                          User: string;
                          User_1: string;
                          User_Name: string;
                          "user-name": string;
                          "my.org.User": string;
                        }
                      }
          export type User = components["schemas"]["User"];
          export type User_1 = components["schemas"]["User_1"];
          export type User_Name = components["schemas"]["User_Name"];
          export type username = components["schemas"]["user-name"];
          export type myorgUser = components["schemas"]["my.org.User"];
          export type Endpoints = keyof paths;
          "
        `);
    });
});
