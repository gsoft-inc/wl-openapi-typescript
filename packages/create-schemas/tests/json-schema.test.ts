import { describe, test, expect as _expect } from "vitest";
import * as JSONSchema from "../src/json-schema.ts";

describe.concurrent("JSONSchema", () => {
    describe.concurrent("toTypeScriptAST", () => {
        test("true", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST(true);
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"unknown\"");
        });

        test("false", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST(false);
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"never\"");
        });

        test("$ref", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                $ref: "#/components/schemas/Foo"
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"Foo\"");
        });

        test("{}", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({});
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"unknown\"");
        });

        test("null", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({ type: "null" });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"null\"");
        });
      
        test("string", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({ type: "string" });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"string\"");
        });

        test("string / nullable", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({ type: "string", nullable: true });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"string | null\"");
        });

        
        test("string / null", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({ type: ["string", "null"] });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"string | null\"");
        });

        test("string / enum", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({ type: "string", enum: ["a", "b"] });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"\"a\" | \"b\"\"");
        });

        test("string / enum / nullable", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({ type: "string", enum: ["a", "b"], nullable: true });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"(\"a\" | \"b\") | null\"");
        });

        test("string / const", ({ expect }) => {
            // See: https://swagger.io/docs/specification/describing-request-body/file-upload/
            const node = JSONSchema.toTypeScriptAST({ type: "string", const: "Hello.World" });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"\"Hello.World\"\"");
        });

        test("string / binary", ({ expect }) => {
            // See: https://swagger.io/docs/specification/describing-request-body/file-upload/
            const node = JSONSchema.toTypeScriptAST({ type: "string", format: "binary" });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"Blob\"");
        });

        test("number", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({ type: "number" });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"number\"");
        });

        test("number / nullable", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({ type: "number", nullable: true });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"number | null\"");
        });

        test("number / enum", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({ type: "number", enum: [1, 2] });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"1 | 2\"");
        });
        
        test("number / enum / nullable", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                type: "number",
                enum: [1, 2],
                nullable: true
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"(1 | 2) | null\"");
        });

        test("boolean", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({ type: "boolean" });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"boolean\"");
        });

        test("boolean / nullable", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({ type: "boolean", nullable: true });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"boolean | null\"");
        });

        test("boolean / enum", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({ type: "boolean", enum: [true, false] });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"true | false\"");
        });

        test("boolean / enum / nullable", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                type: "boolean",
                enum: [true, false],
                nullable: true
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"(true | false) | null\"");
        });

        test("oneOf", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                oneOf: [{ type: "string" }, { type: "number" }]
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"string | number\"");
        });

        test("allOf", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                allOf: [{ type: "string" }, { type: "number" }]
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"string & number\"");
        });

        test("anyOf", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }]
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot(
                "\"string | number | boolean | (string & number) | (string & boolean) | (number & boolean)\""
            );
        });

        test("object", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                type: "object",
                properties: {
                    name: { type: "string" },
                    deprecatedValue: { type: "string" }
                }
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot(`
              "{
                  name?: string;
                  deprecatedValue?: string;
              }"
            `);
        });

        test("object / required", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                type: "object",
                required: ["name"],
                properties: {
                    name: { type: "string" },
                    age: { type: "number" }
                }
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot(`
              "{
                  name: string;
                  age?: number;
              }"
            `);
        });

        test("object / unsafe name", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                type: "object",
                properties: {
                    "names[]": {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot(`
              "{
                  "names[]"?: string[];
              }"
            `);
        });

        test("object / description", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                type: "object",
                properties: {
                    name: { type: "string", description: "Name of the person" }
                }
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot(`
              "{
                  /**
                   * Name of the person
                   */
                  name?: string;
              }"
            `);
        });

        test("object / deprecation", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                type: "object",
                properties: {
                    deprecatedValue: { type: "string", deprecated: true }
                }
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot(`
              "{
                  /**
                   * @deprecated
                   */
                  deprecatedValue?: string;
              }"
            `);
        });

        test("object / format", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                type: "object",
                properties: {
                    value: { type: "string", format: "uuid" }
                }
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot(`
              "{
                  /**
                   * @format \`uuid\`
                   */
                  value?: string;
              }"
            `);
        });

        test("object / comment & format & deprecation", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                type: "object",
                properties: {
                    deprecatedValue: {
                        type: "string",
                        description: "The old names",
                        format: "uuid",
                        deprecated: true
                    }
                }
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot(`
              "{
                  /**
                   * The old names
                   * @format \`uuid\`
                   * @deprecated
                   */
                  deprecatedValue?: string;
              }"
            `);
        });

        test("object / additionalProperties", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                type: "object",
                properties: {
                    name: { type: "string" },
                    deprecatedValue: { type: "string" }
                },
                additionalProperties: {}
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot(`
              "{
                  name?: string;
                  deprecatedValue?: string;
              } & Record<string, unknown>"
            `);
        });

        test("array", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                type: "array",
                items: { type: "string" }
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"string[]\"");
        });

        test("array / oneOf", ({ expect }) => {
            const node = JSONSchema.toTypeScriptAST({
                type: "array",
                items: { oneOf: [{ type: "string" }, { type: "number" }] }
            });
            const text = JSONSchema.printAST(node);
            expect(text).toMatchInlineSnapshot("\"(string | number)[]\"");
        });
    });

    test("resolveRefObject", ({ expect }) => {
        const expected = { foo: "bar" };

        const result = JSONSchema.resolveRefObject<typeof expected>(
            { $ref: "#/a/b/c" },
            { a: { b: { c: expected } } }
        );

        expect(result).toEqual(expected);
    });

    describe("toSafeName", () => {
        test.each([
            { input: "User", expected: "User" },
            { input: "User_1", expected: "User_1" },
            { input: "User_Name", expected: "User_Name" },
            { input: "user-name", expected: "username" },
            { input: "my.org.User", expected: "myorgUser" }
        ])("$input => $expected", ({ input, expected }) => {
            const result = JSONSchema.toSafeName(input);
            _expect(result).toEqual(expected);
        });
    });
});