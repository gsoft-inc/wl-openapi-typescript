import assert from "node:assert";
import { astToString, stringToAST } from "openapi-typescript";
import ts from "typescript";
import type { Plugin } from "./plugin.ts";
import { openapiTypeScriptId } from "./openapi-typescript-plugin.ts";

const componentsIdentifier = "components";
const schemasIdentifier = "schemas";

export const RESERVED_IDENTIFIERS = new Set(["paths", "webhooks", componentsIdentifier, "$defs", "operations"]);

export function typesPlugin(): Plugin {
    return {
        name: "internal:types-plugin",
        async transform({ id, code }) {
            if (id !== openapiTypeScriptId) {
                return;
            }

            const ast = stringToAST(code) as ts.Node[];

            const componentsDeclaration = ast.find(isComponentsInterfaceDeclaration);

            assert(componentsDeclaration, "Missing components declaration");
            const schema = componentsDeclaration.members.find(isComponentsSchema);
            assert(schema, "Missing components declaration");
            assert(schema.type && ts.isTypeLiteralNode(schema.type), "Invalid schema type");
        
            const typeNodes = schema.type.members
                .map(member => member.name)
                .filter(name => name !== undefined)
                .filter(name => ts.isStringLiteral(name) || ts.isIdentifier(name))
                .map(name => name.text)
                .map(name => {
                    if (RESERVED_IDENTIFIERS.has(name)) {
                        throw new Error(`Invalid schema name: ${name}`);
                    } else {
                        return name;
                    }
                })
                .map(name => `export type ${toSafeName(name)} = ${componentsIdentifier}["${schemasIdentifier}"]["${name}"];`)
                .flatMap(stringToAST) as ts.Node[];

            const endpointsDeclaration = stringToAST("export type Endpoints = keyof paths;") as ts.Node[];

            return {
                code: code + "\n" + astToString([...typeNodes, ...endpointsDeclaration])
            };
        }
    };
}

export function isComponentsInterfaceDeclaration(node: ts.Node): node is ts.InterfaceDeclaration {
    return ts.isInterfaceDeclaration(node) && node.name.text === componentsIdentifier;
}

export function isComponentsSchema(node: ts.Node): node is ts.PropertySignature {
    return ts.isPropertySignature(node) 
    && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
    && node.name.text === schemasIdentifier;
}


/**
 * OpenAPI field names must match `^[a-zA-Z0-9\.\-_]+$` which allows names that
 * are not valid JavaScript/TypeScript identifiers. This function converts an
 * unsafe name into a safe name that can be used as a JavaScript/TypeScript
 * identifier.
 */
export function toSafeName(unsafeName: string): string {
    let safeName = "";
    for (const char of unsafeName) {
        const charCode = char.charCodeAt(0);

        // A-Z
        if (charCode >= 65 && charCode <= 90) {
            safeName += char;
        }

        // a-z
        if (charCode >= 97 && charCode <= 122) {
            safeName += char;
        }

        if (char === "_" || char === "$") {
            safeName += char;
        }

        // 0-9
        if (safeName.length > 0 && charCode >= 48 && charCode <= 57) {
            safeName += char;
        }

        continue;
    }

    return safeName;
}
