import fs from "node:fs";
import path from "path";
import parser from "yargs-parser";
import openapiTS, { astToString } from "openapi-typescript";
import { getSchemaNames, generateExportSchemaTypeDeclaration, generateExportEndpointsTypeDeclaration } from "./astHelper.ts";

console.log("Received command: ", process.argv);

// Access command-line arguments
const args = process.argv.slice(2);

const flags = parser(args, {
    boolean: [
        "additionalProperties",
        "alphabetize",
        "arrayLength",
        "defaultNonNullable",
        "propertiesRequiredByDefault",
        "emptyObjectsUnknown",
        "enum",
        "enumValues",
        "excludeDeprecated",
        "exportType",
        "help",
        "immutable",
        "pathParamsAsTypes"
    ],
    string: ["output", "redocly"],
    alias: {
        redocly: ["c"],
        exportType: ["t"],
        output: ["o"]
    }
});

const openApiPath = args[0];
const outputPath = flags.output || "openapi-types.ts";
const openapiTypescriptArgs = args.slice(2).join(" ") ?? "";

if (!openApiPath || !outputPath) {
    throw new Error("Both openApiPath and outputPath must be provided");
}

console.log("Starting OpenAPI TypeScript types generation...");
console.log(`\t-openApiPath: ${openApiPath}`);
console.log(`\t-outputPath: ${outputPath}`);
console.log(`\t-openapiTypescriptArgs: ${openapiTypescriptArgs}`);

// Create a TypeScript AST from the OpenAPI schema
const ast = await openapiTS(new URL(openApiPath), {
    additionalProperties: flags.additionalProperties,
    alphabetize: flags.alphabetize,
    arrayLength: flags.arrayLength,
    propertiesRequiredByDefault: flags.propertiesRequiredByDefault,
    defaultNonNullable: flags.defaultNonNullable,
    emptyObjectsUnknown: flags.emptyObjectsUnknown,
    enum: flags.enum,
    enumValues: flags.enumValues,
    excludeDeprecated: flags.excludeDeprecated,
    exportType: flags.exportType,
    immutable: flags.immutable,
    pathParamsAsTypes: flags.pathParamsAsTypes
});

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

// 5. Write the content to a file (TODO: Validate USER experience)
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, contents);

console.log(`OpenAPI TypeScript types have been generated successfully at ${outputPath}! 🎉`);
