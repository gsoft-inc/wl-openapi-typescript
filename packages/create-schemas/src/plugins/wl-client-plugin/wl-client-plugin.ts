/* eslint-disable @typescript-eslint/no-explicit-any */
import { fileURLToPath } from "url";
import type { Plugin } from "../plugin.ts";
import { readFile } from "fs/promises";
import YAML from "yaml";
import * as JSONSchema from "../../json-schema.ts";
import ts from "typescript";
import { code as baseCode } from "./workleap-client.ts";
import { documentToTypeNodes } from "../types-plugin.ts";
import type { OpenAPI3, OperationObject, ParameterObject, ReferenceObject } from "openapi-typescript";

export function clientPlugin(): Plugin {
    return {
        name: "workleap-client-plugin",
        async buildStart({ config, emitFile }) {
            const url = new URL(config.input);
            const document = await getDocument(url);
            
            const code = documentToClient(document);
            const types = documentToTypeNodes(document);

            emitFile({
                filename: "wl-client.ts",
                code: baseCode + "\n" + code + "\n" + JSONSchema.printAST(types)
            });
        }
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDocument(url: URL): Promise<OpenAPI3> {
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

function documentToClient(document: OpenAPI3): string {
    const ast: ts.Node[] = [];
    const methodDeclarations: ts.MethodDeclaration[] = [];
    const importedTypes = new Set<string>();

    if (!document.paths) {
        return "";
    }

    for (const path of Object.keys(document.paths)) {
        const pathItem = JSONSchema.resolveRefObject(document.paths[path], document);
        const methods: Record<string, ReferenceObject | OperationObject | undefined> = {
            get: pathItem.get,
            post: pathItem.post,
            put: pathItem.put,
            patch: pathItem.patch,
            delete: pathItem.delete,
            head: pathItem.head,
            options: pathItem.options,
            trace: pathItem.trace
        };

        const pathItemParameters = (pathItem.parameters ?? []).map(parameter => JSONSchema.resolveRefObject(parameter, document));

        for (const [method, operationOrRefObject] of Object.entries(methods)) {
            const operation = JSONSchema.resolveRefObject(operationOrRefObject, document);
            if (!operation) {
                continue;
            }

            const operationParameters = (operation.parameters ?? []).map(parameter => JSONSchema.resolveRefObject(parameter, document));
        
            const parameters = [...pathItemParameters, ...operationParameters];

            const name = toMethodName({ path, method, operation });

            const types = {
                init: capitalize(name) + "Init"
            };

            // ====== Request ======
            let initRequired = false;
            const requestProperties: ts.PropertySignature[] = [];
            
            // ======== Body ========
            const requestBody = JSONSchema.resolveRefObject(operation.requestBody, document);
            if (requestBody) {
                const applicationJson = JSONSchema.resolveRefObject(requestBody.content["application/json"], document);
                if (applicationJson && applicationJson.schema) {
                    const bodyType = JSONSchema.toTypeScriptAST(applicationJson.schema);
                    JSONSchema.annotate(bodyType, JSONSchema.resolveRefObject(applicationJson.schema, document));

                    requestProperties.push(
                        ts.factory.createPropertySignature(
                            undefined,
                            "body",
                            requestBody.required ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                            bodyType
                        )
                    );
                    if (requestBody.required) {
                        initRequired = true;
                    }
                }
            }

            // ======== Path Params ========
            const pathParams = parameters.filter(parameter => parameter.in === "path");
            const pathRequired = pathParams.some(item => item.required);
            const pathProperties = pathParams.map(parameterToTypeScriptAST);

            if (pathRequired) {
                initRequired = true;
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
            const queryParams = parameters.filter(parameter => parameter.in === "query");
            const queryRequired = queryParams.some(item => item.required);
            const queryProperties = queryParams.map(parameterToTypeScriptAST);

            if (queryRequired) {
                initRequired = true;
            }

            if (queryProperties.length > 0) {
                requestProperties.push(ts.factory.createPropertySignature(
                    undefined,
                    "query",
                    queryRequired ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                    ts.factory.createTypeLiteralNode(queryProperties)
                ));
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

            // ====== Responses ======
            const successTypes = [];
            const errorTypes = [];
            if (operation.responses) {
                for (const [statusCode, responseOrRefObject] of Object.entries(operation.responses)) {
                    const response = JSONSchema.resolveRefObject(responseOrRefObject, document);

                    if (!response.content || !response.content["application/json"]) {
                        continue;
                    }

                    const applicationJson = response.content["application/json"];

                    if (applicationJson.schema) {
                        const typeNode = JSONSchema.toTypeScriptAST(applicationJson.schema);
                        if (statusCode === "default") {
                        // We assume "default" responses are errors. This is a
                        // willful spec deviation, as the specification does
                        // not say whether "default" responses are successful
                        // or error responses.
                            errorTypes.push(typeNode);
                        } else if (Number(statusCode) >= 200 && Number(statusCode) < 300) {
                            successTypes.push(typeNode);
                        } else {
                            errorTypes.push(typeNode);
                        }

                        if (ts.isIdentifier(typeNode)) {
                            importedTypes.add(typeNode.text);
                        }
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
                            ts.factory.createStringLiteral(path),
                            ts.factory.createIdentifier("init")
                        ]
                    ))],
                    true
                )
            );

            JSONSchema.annotate(methodNode, operation, `\`${method.toUpperCase()} ${path}\`\n`);

            methodDeclarations.push(methodNode); 
        }
    }

    const clientNode = ts.factory.createClassDeclaration(
        [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createIdentifier(JSONSchema.toSafeName(document.info.title + "Client")),
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

interface MethodNameInput {
    method: string;
    path: string;
    operation: OperationObject;
}

function toMethodName({ method, path, operation }: MethodNameInput): string {
    if (operation.operationId) {
        return toCamelCase(JSONSchema.toSafeName(operation.operationId));
    }

    let methodName = method;
    let capitalizeNext = true;
    for (const char of path) {
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

function parameterToTypeScriptAST(item: ParameterObject) {
    const property = ts.factory.createPropertySignature(
        undefined,
        JSONSchema.isUnsafeName(item.name) ? ts.factory.createStringLiteral(item.name) : item.name,
        item.required ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
        item.schema ? JSONSchema.toTypeScriptAST(item.schema) : ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
    );

    JSONSchema.annotate(property, item.schema ? { ...item.schema, ...item } : item);
    
    return property;
}