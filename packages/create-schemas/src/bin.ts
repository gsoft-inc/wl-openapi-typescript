import fs from "node:fs";
import path from "path";
import { getOpenApiTsOptionForArgs, getOutputPath } from "./argsHelper.ts";
import { generateSchemas } from "./openapiTypescriptHelper.ts";

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

const contents = await generateSchemas(openApiPath, outputPath, openApiTsOptions);

// Write the content to a file
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, contents);
