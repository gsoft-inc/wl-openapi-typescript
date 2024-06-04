import fs from "node:fs";
import openapiTS, { astToString } from "openapi-typescript";
import ts, { InterfaceDeclaration, PropertySignature } from "typescript";

console.log("Received command: ", process.argv);

// Access command-line arguments
const args = process.argv.slice(2);

const openApiPath = args[0] ?? "C:/dev/idp/wl-openapi-typescript/wl-openapi-typescript/v1.yaml";
const outputPath = args[1] ?? "C:/dev/idp/wl-openapi-typescript/wl-openapi-typescript/output.ts";
console.log(`openApiPath: ${openApiPath}`);
console.log(`outputPath: ${outputPath}`);


// 1. Create a TypeScript AST from the OpenAPI schema
const ast = await openapiTS(new URL(openApiPath));

// 2. Find the node where all the DTOs are defined, and extract their names
// const componentsNode = ast.find((node) => ts.isInterfaceDeclaration(node) && node.name.escapedText === "components") as InterfaceDeclaration;
//console.log(ts.ClassificationType);
// const schemaNode = componentsNode.members.find((node) => ts.isPropertySignature(node) && ts.isIdentifier(node.name) && node.name.escapedText === "schemas") as PropertySignature;
const schemaNames: string[] = [];
// const typeNode = schemaNode.type;
// if (typeNode && ts.isTypeNode(typeNode)) {
//   typeNode.forEachChild((node) => {
//     if (ts.isPropertySignature(node)) {
//       const nameNode = node.name;
//       if (ts.isIdentifier(nameNode)) {
//         schemaNames.push(nameNode.escapedText as string);
//       }
//     }
//   });
// }


// 3. Convert the AST to a string
let contents = astToString(ast);

// 4. Add the `export type X = components["schemas"]["X"]` lines
for (const schemaName of schemaNames) {
    contents +=
      `export type ${schemaName} = components["schemas"]["${schemaName}"];\n`;
}


// 5. Write the content to a file (TODO: Validate USER experience)
fs.mkdirSync("./dist", { recursive: true });
fs.writeFileSync("./dist/schema.ts", contents);
