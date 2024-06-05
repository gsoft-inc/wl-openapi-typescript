import fs from "node:fs";
import path from "path";
import { astToString } from "openapi-typescript";
import { getSchemaNames, generateExportSchemaTypeDeclaration, generateExportEndpointsTypeDeclaration } from "./astHelper.ts";
import { getAst, getOpenApiTsOptionForArgs, getOutputPath } from "./openapiTypescriptHelper.ts";

console.log("Received command: ", process.argv);

// Access command-line arguments
const args = process.argv.slice(2);

const openApiTsOptions = getOpenApiTsOptionForArgs(args);

const openApiPath = args[0];
const outputPath = getOutputPath(args);

if (!openApiPath || !outputPath) {
    throw new Error("Both openApiPath and outputPath must be provided");
}

console.log("Starting OpenAPI TypeScript types generation...");
console.log(`\t-openApiPath: ${openApiPath}`);
console.log(`\t-outputPath: ${outputPath}`);

// Create a TypeScript AST from the OpenAPI schema
const ast = await getAst(openApiPath, openApiTsOptions);

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

// Write the content to a file
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, contents);


if (schemaNames.length === 0) {
    console.warn(`⚠️ Suspiciously no schemas where found in the OpenAPI document at ${openApiPath}. It might due to a flag converting interface to type which is not supported at the moment. ⚠️`);
} else {
    console.log(`OpenAPI TypeScript types have been generated successfully at ${outputPath}! 🎉`);
}
