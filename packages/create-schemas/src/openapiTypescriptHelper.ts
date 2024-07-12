import openapiTS, { astToString } from "openapi-typescript";
import {
    generateExportEndpointsTypeDeclaration,
    generateExportSchemaTypeDeclaration,
    getSchemaNames
} from "./astHelper.ts";
import type { ResolvedConfig } from "./config.ts";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

export async function generateSchemas(config: ResolvedConfig): Promise<string> {
    // Create a TypeScript AST from the OpenAPI schema
    const ast = await openapiTS(new URL(config.input), {
        ...config.openApiTsOptions,
        silent: true
    });

    // Find the node where all the DTOs are defined, and extract their names
    const schemaNames = getSchemaNames(ast);

    // Convert the AST to a string
    let contents = astToString(ast);

    // Re-export schemas types
    for (const schemaName of schemaNames) {
        contents += `${generateExportSchemaTypeDeclaration(schemaName)}\n`;
    }

    // Re-export endpoints keys
    contents += `\n${generateExportEndpointsTypeDeclaration()}\n`;

    // Write the files
    await mkdir(dirname(fileURLToPath(config.output)), { recursive: true });
    await writeFile(fileURLToPath(config.output), contents);

    return contents;
}
