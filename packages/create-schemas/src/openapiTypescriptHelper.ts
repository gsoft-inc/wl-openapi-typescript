import openapiTS, { astToString, type OpenAPITSOptions } from "openapi-typescript";
import { generateExportEndpointsTypeDeclaration, generateExportSchemaTypeDeclaration, getSchemaNames } from "./astHelper.ts";

export async function generateSchemas(openApiPath: string, outputPath: string, openApiTsOptions: OpenAPITSOptions): Promise<string> {
    // Create a TypeScript AST from the OpenAPI schema
    const ast = await openapiTS(new URL(openApiPath), openApiTsOptions);

    // Find the node where all the DTOs are defined, and extract their names
    const schemaNames = getSchemaNames(ast);

    // Convert the AST to a string
    let contents = astToString(ast);

    // Re-export schemas types
    console.log(`Exporting ${schemaNames.length} schemas.`);
    for (const schemaName of schemaNames) {
        contents += `${generateExportSchemaTypeDeclaration(schemaName)}\n`;
    }

    // Re-export endpoints keys
    console.log("Exporting endpoints keys.");
    contents += `\n${generateExportEndpointsTypeDeclaration()}\n`;

    if (schemaNames.length === 0) {
        console.warn(`⚠️ Suspiciously no schemas where found in the OpenAPI document at ${openApiPath}. It might due to a flag converting interface to type which is not supported at the moment. ⚠️`);
    } else {
        console.log(`OpenAPI TypeScript types have been generated successfully at ${outputPath}! 🎉`);
    }

    return contents;
}
