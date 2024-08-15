import assert from "node:assert";
import { astToString, stringToAST } from "openapi-typescript";
import ts from "typescript";
import type { Plugin } from "./plugin.ts";
import { openapiTypeScriptId } from "./openapi-typescript-plugin.ts";
import * as JSONSchema from "../json-schema.ts";

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
                    }

                    if (JSONSchema.toSafeName(name).length === 0) {
                        throw new Error(`Invalid schema name: ${name}`);
                    }

                    return name;
                })
                .map(name => `export type ${JSONSchema.toSafeName(name)} = ${componentsIdentifier}["${schemasIdentifier}"]["${name}"];`)
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