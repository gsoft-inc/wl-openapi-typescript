import fs from "node:fs";
import openapiTS, { astToString } from "openapi-typescript";
import { getSchemaNames, generateExportSchemaTypeDeclaration, generateExportEndpointsTypeDeclaration } from "./astHelper.ts";

console.log("Received command: ", process.argv);

// Access command-line arguments
const args = process.argv.slice(2);

const openApiPath = args[0] ?? "C:/dev/idp/wl-openapi-typescript/wl-openapi-typescript/v1.yaml";
const outputPath = args[1] ?? "C:/dev/idp/wl-openapi-typescript/wl-openapi-typescript/output.ts";
console.log(`openApiPath: ${openApiPath}`);
console.log(`outputPath: ${outputPath}`);

// Create a TypeScript AST from the OpenAPI schema
const ast = await openapiTS(new URL(openApiPath));

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

// 5. Write the content to a file (TODO: Validate USER experience)
fs.mkdirSync("./dist", { recursive: true });
fs.writeFileSync("./dist/schema.ts", contents);
