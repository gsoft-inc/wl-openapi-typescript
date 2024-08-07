/* eslint-disable @typescript-eslint/no-explicit-any */
import { fileURLToPath } from "url";
import type { Plugin } from "../plugin.ts";
import { readFile } from "fs/promises";
import YAML from "yaml";
import * as JSONSchema from "../../json-schema.ts";
import ts from "typescript";
import { code as baseCode } from "./workleap-client.ts";
import type { JSONSchema7 } from "json-schema";
import { documentToTypeNodes } from "../types-plugin.ts";

export function clientPlugin(): Plugin {
    return {
        name: "workleap-client-plugin",
        async buildStart({ config, emitFile }) {
            const url = new URL(config.input);
            const document = await getDocument(url);
            const operations = getOperations(document);
            
            if (operations.length > 0) {
                const code = operationsToClient(operations, JSONSchema.toSafeName(document.info.title));
                const types = documentToTypeNodes(document);

                emitFile({
                    filename: "wl-client.ts",
                    code: baseCode + "\n" + code + "\n" + JSONSchema.printAST(types)
                });
            }
        }
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDocument(url: URL): Promise<any> {
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


const mediaType = "application/json";

interface Operation {
    path: string;
    method: string;
    tags: string[];
    summary?: string;
    description?: string;
    operationId?: string;
    request?: OperationRequest;
    responses: OperationResponse[];
    deprecated: boolean;
}

interface OperationRequest {
    path: any[];
    query: any[];
    header: any[];
    cookie: any[];
    body?: any;
}

interface OperationResponse {
    description: string;
    contents: OperationResponseContent[];
    statusCode: number | "default";
}

interface OperationResponseContent {
    mediaType: string;
    schema: JSONSchema7;
}

const METHODS = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];

function getOperations(document: any): Operation[] {
    if ("paths" in document === false || typeof document.paths !== "object") {
        return [];
    }

    const paths = document.paths;
    const operations: Operation[] = [];
    for (const path of Object.keys(paths)) {
        const methods = Object.keys(paths[path]).filter(method => METHODS.includes(method));
        const pathParameters = paths[path].parameters ?? [];
        for (const method of methods) {
            const operation = paths[path][method];
            const parameters = [...pathParameters, ...operation.parameters ?? []];

            operations.push({
                path,
                method,
                tags: operation.tags ?? [],
                summary: operation.summary,
                description: operation.description,
                operationId: operation.operationId,
                request: {
                    path: parameters.filter((param: any) => param.in === "path"),
                    query: parameters.filter((param: any) => param.in === "query"),
                    header: parameters.filter((param: any) => param.in === "header"),
                    cookie: parameters.filter((param: any) => param.in === "cookie"),
                    body: operation.requestBody
                },
                responses: Object.keys(operation.responses ?? {}).map(statusCode => {
                    const responseObj = operation.responses[statusCode];

                    return {
                        statusCode: statusCode === "default" ? "default" : Number(statusCode),
                        description: responseObj.description,
                        contents: Object.keys(responseObj.content ?? {}).map(mediaType => ({
                            mediaType,
                            schema: responseObj.content[mediaType].schema
                        }))
                    };
                }),
                deprecated: operation.deprecated ?? false
            });
        }
    }

    return operations;
}

function operationsToClient(operations: Operation[], clientName: string): string {
    const ast: ts.Node[] = [];
    const methodDeclarations: ts.MethodDeclaration[] = [];
    const importedTypes = new Set<string>();

    for (const operation of operations) {
        const name = toMethodName(operation);

        const types = {
            init: capitalize(name) + "Init"
        };

        // ====== Request ======
        let initRequired = false;
        if (operation.request) {
            const request = operation.request;
            const requestProperties: ts.PropertySignature[] = [];
            
            // ======== Body ========
            const match = Object.keys(request.body?.content ?? {}).find(contentType => contentType === mediaType);
            if (request.body && match) {
                const bodyContent = request.body.content[match];
                const bodyType = JSONSchema.toTypeScriptAST(bodyContent.schema);
                JSONSchema.annotate(bodyType, bodyContent.schema);
                requestProperties.push(
                    ts.factory.createPropertySignature(undefined, "body", undefined, bodyType)
                );
                initRequired = true; 
            }

            // ======== Path Params ========
            let pathRequired = false;
            const pathProperties: ts.PropertySignature[] = [];
            for (const item of request.path) {
                const questionToken = item.required ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken);
                const property = ts.factory.createPropertySignature(
                    undefined,
                    JSONSchema.isUnsafeName(item.name) ? ts.factory.createStringLiteral(item.name) : item.name,
                    questionToken,
                    JSONSchema.toTypeScriptAST(item.schema)
                );
                JSONSchema.annotate(property, { ...item.schema, ...item });
                pathProperties.push(property);
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

            // ======== Query Params ========
            let queryRequired = false;
            const queryProperties: ts.PropertySignature[] = [];
            for (const item of request.query) {
                const questionToken = item.required ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken);
                const property = ts.factory.createPropertySignature(
                    undefined,
                    JSONSchema.isUnsafeName(item.name) ? ts.factory.createStringLiteral(item.name) : item.name,
                    questionToken,
                    JSONSchema.toTypeScriptAST(item.schema)
                );
                JSONSchema.annotate(property, { ...item.schema, ...item });
                queryProperties.push(property);
                if (!questionToken) {
                    queryRequired = true;
                    initRequired = true;
                }
            }

            if (queryProperties.length > 0) {
                requestProperties.push(
                    ts.factory.createPropertySignature(
                        undefined,
                        "query",
                        queryRequired ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                        ts.factory.createTypeLiteralNode(queryProperties)
                    )
                );
            }


            requestProperties.push(
                ts.factory.createPropertySignature(
                    undefined,
                    "request",
                    ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                    ts.factory.createTypeReferenceNode("RequestInit")
                )
            );


            // ===== Init Type =====
            const interfaceNode = ts.factory.createInterfaceDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                types.init,
                undefined,
                undefined,
                requestProperties
            );

            ast.push(interfaceNode);
        }


        // ====== Responses ======
        const successTypes = [];
        const errorTypes = [];
        for (const response of operation.responses) {
            const content = response.contents.find(_content => _content.mediaType === mediaType);
            if (!content) {
                continue;
            }

            if (content.schema) {
                const typeNode = JSONSchema.toTypeScriptAST(content.schema);
                if (response.statusCode === "default") {
                    // We assume "default" responses are errors. This is a
                    // willful spec deviation, as the specification does not
                    // say whether "default" responses are successful or error
                    // responses.
                    errorTypes.push(typeNode);
                } else if (response.statusCode >= 200 && response.statusCode < 300) {
                    successTypes.push(typeNode);
                } else {
                    errorTypes.push(typeNode);
                }

                if (ts.isIdentifier(typeNode)) {
                    importedTypes.add(typeNode.text);
                }
            }
        }

        if (successTypes.length === 0) {
            successTypes.push(ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword));
        }

        if (errorTypes.length === 0) {
            errorTypes.push(ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword));
        }

        // ====== Methods ======
        const methodNode = ts.factory.createMethodDeclaration(
            undefined,
            undefined,
            name,
            undefined,
            undefined,
            [
                ts.factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    "init",
                    undefined,
                    ts.factory.createTypeReferenceNode(types.init),
                    initRequired ? undefined : ts.factory.createObjectLiteralExpression([], false)
                )
            ],
            ts.factory.createTypeReferenceNode("Promise", [
                ts.factory.createTypeReferenceNode("Result", [
                    ts.factory.createUnionTypeNode(successTypes),
                    ts.factory.createUnionTypeNode(errorTypes)
                ])
            ]),
            ts.factory.createBlock(
                [ts.factory.createReturnStatement(ts.factory.createCallExpression(
                    ts.factory.createPropertyAccessExpression(
                        ts.factory.createThis(),
                        "fetch"
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

        JSONSchema.annotate(methodNode, operation, `\`${operation.method.toUpperCase()} ${operation.path}\`\n`);

        methodDeclarations.push(methodNode); 
    }

    const clientNode = ts.factory.createClassDeclaration(
        [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createIdentifier(clientName + "Client"),
        undefined,
        [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier("BaseClient"), undefined)])],
        [
            ts.factory.createConstructorDeclaration(
                undefined,
                [ts.factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    "options",
                    undefined,
                    ts.factory.createTypeReferenceNode("BaseClientOptions"),
                    ts.factory.createObjectLiteralExpression(
                        [],
                        false
                    )
                )],
                ts.factory.createBlock(
                    [ts.factory.createExpressionStatement(ts.factory.createCallExpression(
                        ts.factory.createSuper(),
                        undefined,
                        [ts.factory.createIdentifier("options")]
                    ))],
                    true
                )
            ),
            ...methodDeclarations
        ]
    );

    ast.push(clientNode);

    return JSONSchema.printAST(ast);
}

function toMethodName(operation: Operation) {
    if (operation.operationId) {
        return toCamelCase(JSONSchema.toSafeName(operation.operationId));
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

function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function toCamelCase(str: string) {
    return str.charAt(0).toLowerCase() + str.slice(1);
}