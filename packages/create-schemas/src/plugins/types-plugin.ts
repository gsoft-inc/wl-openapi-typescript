import ts from "typescript";
import * as JSONSchema from "../json-schema.ts";
import type { Plugin } from "./plugin.ts";
import { getDocument } from "./wl-client-plugin/wl-client-plugin.ts";

export function typesPlugin(): Plugin {
    return {
        name: "internal:types-plugin",
        async buildStart({ config, emitFile }) {
            const url = new URL(config.input);
            const document = await getDocument(url);
            const ast = documentToTypeNodes(document);

            if (ast.length > 0) {
                emitFile({
                    filename: "types.ts",
                    code: JSONSchema.printAST(ast)
                });
            }
        }
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function documentToTypeNodes(document: any): ts.Node[] {
    const ast: ts.Node[] = [];

    if ("components" in document) {
        const components = document.components;
        if ("schemas" in components) {
            for (const schemaName of Object.keys(components.schemas)) {
                const schema = components.schemas[schemaName];

                const type = ts.factory.createTypeAliasDeclaration(
                    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                    JSONSchema.toSafeName(schemaName),
                    undefined,
                    JSONSchema.toTypeScriptAST(schema)
                );

                JSONSchema.annotate(type, schema);

                ast.push(type);
            }
        }
    }

    return ast;
}