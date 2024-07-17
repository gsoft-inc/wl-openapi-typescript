import { fileURLToPath } from "url";
import type { Plugin } from "../plugin.ts";
import { dereference } from "@apidevtools/json-schema-ref-parser";
import { readFile } from "fs/promises";
import YAML from "yaml";
import { transformOas3Operations } from "@stoplight/http-spec/oas3";
import { toSafeName } from "../types-plugin.ts";
import { JSONSchemaToTypeScriptAST } from "./json-schema.ts";
import { astToString } from "openapi-typescript";
import ts from "typescript";
import { code as baseCode } from "./workleap-client.ts";

export function clientPlugin(): Plugin {
    return {
        name: "workleap-client-plugin",
        async buildStart({ config, emitFile }) {
            const url = new URL(config.input);
            const document = await getDocument(url);
            const schema = await dereference(document);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const operations = transformOas3Operations(schema as any);
            const code = operationsToClient(operations);
            emitFile({
                filename: "wl-client.ts",
                code: baseCode + "\n" + code
            });
        }
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDocument(url: URL): Promise<any> {
    if (url.protocol === "http:" || url.protocol === "https:") {
        const response = await fetch(url);

        return response.json();
    } else if (url.protocol === "file:") {
        const path = fileURLToPath(url);

        return YAML.parse(await readFile(path, "utf-8"));
    } else {
        throw new Error(`Unsupported protocol: ${url.protocol}`);
    }
}

type IHTTPOperation = ReturnType<typeof transformOas3Operations>[number];

const mediaType = "application/json";

function operationsToClient(operations: IHTTPOperation[]): string {
    const ast: ts.Node[] = [];
    for (const operation of operations) {
        const name = toMethodName(operation);

        // ====== Request ======
        let initRequired = false;
        if (operation.request) {
            const request = operation.request;
            const bodyContent = operation.request.body?.contents?.find(_content => _content.mediaType === mediaType);
            const requestProperties: ts.PropertySignature[] = [];

            if (bodyContent?.schema) {
                const bodyType = JSONSchemaToTypeScriptAST(bodyContent?.schema);
                requestProperties.push(
                    ts.factory.createPropertySignature(undefined, "body", undefined, bodyType)
                );
                initRequired = true;
            }

            let pathRequired = false;
            const pathProperties: ts.PropertySignature[] = [];
            for (const item of request.path ?? []) {
                const questionToken = item.required ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken);
                pathProperties.push(
                    ts.factory.createPropertySignature(
                        undefined,
                        item.name,
                        questionToken,
                        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                    )
                );
                if (!questionToken) {
                    pathRequired = true;
                    initRequired = true;
                }
            }

            if (pathProperties.length > 0) {
                requestProperties.push(
                    ts.factory.createPropertySignature(
                        undefined,
                        "path",
                        pathRequired ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                        ts.factory.createTypeLiteralNode(pathProperties)
                    )
                );
            }

            const interfaceNode = ts.factory.createInterfaceDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                name + "Init",
                undefined,
                [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
                    ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier("WorkleapClientInit"), undefined)]
                )],
                requestProperties
            );

            ast.push(interfaceNode);
        }


        // ====== Responses ======
        const successTypes = [];
        const errorTypes = [];
        for (const response of operation.responses) {
            const content = response.contents?.find(_content => _content.mediaType === mediaType);
            if (!content) {
                continue;
            }

            if (content.schema) {
                const typeNode = JSONSchemaToTypeScriptAST(content.schema);
                if (response.code === "default" || (Number(response.code) >= 200 && Number(response.code) < 300)) {
                    successTypes.push(typeNode);
                } else {
                    errorTypes.push(typeNode);
                }
            }
        }

        if (successTypes.length === 1) {
            ast.push(ts.factory.createTypeAliasDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                name + "Result",
                undefined,
                successTypes[0]
            ));
        } else if (successTypes.length > 1) {
            ast.push(ts.factory.createTypeAliasDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                name + "Result",
                undefined,
                ts.factory.createUnionTypeNode(successTypes)
            ));
        } else {
            ast.push(ts.factory.createTypeAliasDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                name + "Result",
                undefined,
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
            ));
        }

        if (errorTypes.length === 1) {
            ast.push(ts.factory.createTypeAliasDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                name + "Error",
                undefined,
                errorTypes[0]
            ));
        } else if (successTypes.length > 1) {
            ast.push(ts.factory.createTypeAliasDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                name + "Error",
                undefined,
                ts.factory.createUnionTypeNode(errorTypes)
            ));
        } else {
            ast.push(ts.factory.createTypeAliasDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                name + "Error",
                undefined,
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
            ));
        }

        const functionNode = ts.factory.createFunctionDeclaration(
            [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
            undefined,
            name,
            undefined,
            [
                ts.factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    "client",
                    undefined,
                    ts.factory.createTypeReferenceNode("WorkleapClient")
                ),
                ts.factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    "init",
                    undefined,
                    ts.factory.createTypeReferenceNode(name + "Init"),
                    initRequired ? undefined : ts.factory.createObjectLiteralExpression([], false)
                )
            ],
            ts.factory.createTypeReferenceNode("Promise", [
                ts.factory.createTypeReferenceNode("WorkleapClientResponse", [
                    ts.factory.createTypeReferenceNode(name + "Result"),
                    ts.factory.createTypeReferenceNode(name + "Error")
                ])
            ]),
            ts.factory.createBlock(
                [ts.factory.createReturnStatement(ts.factory.createCallExpression(
                    ts.factory.createPropertyAccessExpression(
                        ts.factory.createIdentifier("client"),
                        ts.factory.createIdentifier("fetch")
                    ),
                    undefined,
                    [
                        ts.factory.createStringLiteral(operation.path),
                        ts.factory.createIdentifier("init")
                    ]
                ))],
                true
            )
        );

        ast.push(functionNode); 
    }

    return astToString(ast);
}

function toMethodName(operation: IHTTPOperation) {
    if (operation.iid) {
        return toSafeName(operation.iid);
    }

    let methodName = operation.method;
    let capitalizeNext = true;
    for (const char of operation.path) {
        const charCode = char.charCodeAt(0);

        if (char === "{") {
            methodName += "By";
            capitalizeNext = true;
            continue;
        }

        // A-Z
        if (charCode >= 65 && charCode <= 90) {
            methodName += char;
            capitalizeNext = false;
            continue;
        }

        // a-z
        if (charCode >= 97 && charCode <= 122) {
            if (capitalizeNext) {
                methodName += char.toUpperCase();
                capitalizeNext = false;
            } else {
                methodName += char;
            }
            continue;
        }

        capitalizeNext = true;
    }

    return methodName;
}
