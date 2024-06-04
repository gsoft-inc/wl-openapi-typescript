import fs from "node:fs";
import openapiTS, { astToString } from "openapi-typescript";

console.log("Received command: ", process.argv);

// Access command-line arguments
const args = process.argv.slice(2);

const openApiPath = args[0] ?? "C:/dev/idp/wl-openapi-typescript/wl-openapi-typescript/v1.yaml";
const outputPath = args[1] ?? "C:/dev/idp/wl-openapi-typescript/wl-openapi-typescript/output.ts";
console.log(`openApiPath: ${openApiPath}`);
console.log(`outputPath: ${outputPath}`);


// TODO: Support filename and URL
const ast = await openapiTS(new URL(openApiPath, import.meta.filename));
const contents = astToString(ast);

// (optional) write to file
fs.writeFileSync(outputPath, contents);
