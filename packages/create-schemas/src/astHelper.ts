// Inspired from https://openapi-ts.pages.dev/node

import ts, { type InterfaceDeclaration, type PropertySignature } from "typescript";

// Extract schema names from AST
// export interface components {
//     schemas: {
//         ExampleA: {
//             /** Format: int32 */
//             point: number;
//         };
//         ExampleB: {
//             /** Format: uuid */
//             operationId: string;
//             code?: string | null;
//         };
//     };
//     responses: never;
//     parameters: never;
//     requestBodies: never;
//     headers: never;
//     pathItems: never;
// }
export function getSchemaNames(ast: ts.Node[]): string[] {
    // Find the `components` interface
    const componentsNode = ast.find(node => ts.isInterfaceDeclaration(node) && node.name.escapedText === "components") as InterfaceDeclaration;
    if (!componentsNode) {
        return [];
    }

    // Find the `schemas` property
    const schemaNode = componentsNode.members.find(node => ts.isPropertySignature(node) && ts.isIdentifier(node.name) && node.name.escapedText === "schemas") as PropertySignature;
    if (!schemaNode || !schemaNode.type || !ts.isTypeLiteralNode(schemaNode.type)) {
        return [];
    }

    // Get the schema names
    const schemaNames = schemaNode.type.members
        .filter(ts.isPropertySignature)
        .filter(node => ts.isIdentifier(node.name))
        .map(node => (node.name as ts.Identifier).escapedText as string);

    return schemaNames;
}

// Generate re-exporting schemas type declaration
export function generateExportSchemaTypeDeclaration(schemaName: string): string {
    return `export type ${schemaName} = components["schemas"]["${schemaName}"];`;
}

// TODO: Validate how deal with route params
export function generateExportEndpointsTypeDeclaration(): string {
    return `export type Endpoints = keyof paths;`;
}
