import type { Plugin } from "../plugin.ts";
import * as JSONSchema from "../../json-schema.ts";
import ts from "typescript";
import type { OpenAPIV2, OpenAPIV3 } from "openapi-types";
import type { OpenAPIDocument, OperationObject, ReferenceObject } from "../../types.ts";

export function clientPlugin(): Plugin {
    return {
        name: "client-plugin",
        async buildStart({ document, emitFile }) {
            const client = documentToClient(document);
            const types = documentToTypeNodes(document);
            const baseClientPath = "\"@workleap/create-schemas/plugins/client-plugin/base-client\"";

            emitFile({
                filename: "client.ts",
                code: [
                    `import { BaseClient, type BaseClientOptions, type Result } from ${baseClientPath};\n\n`,
                    `export type { BaseClientOptions, Result, Middleware } from ${baseClientPath};\n\n`,
                    JSONSchema.printAST(client),
                    JSONSchema.printAST(types)
                ].join("")
            });
        }
    };
}

function documentToClient(document: OpenAPIDocument): ts.Node[] {
    const ast: ts.Node[] = [];
    const methodDeclarations: ts.MethodDeclaration[] = [];

    if (!document.paths) {
        return [];
    }

    for (const path of Object.keys(document.paths)) {
        const pathItem = JSONSchema.resolveRefObject(document.paths[path], document);

        if (!pathItem) {
            continue;
        }

        const methods: Record<string, ReferenceObject | OperationObject | undefined> = {
            get: pathItem.get,
            post: pathItem.post,
            put: pathItem.put,
            patch: pathItem.patch,
            delete: pathItem.delete,
            head: pathItem.head,
            options: pathItem.options
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
            const requestProperties: ts.PropertySignature[] = [];
            
            // ======== Body ========
            const requestBody = JSONSchema.resolveRefObject("requestBody" in operation ? operation.requestBody : undefined, document);
            const bodyRequired = requestBody?.required ?? false;
            let contentType: "application/json" | "multipart/form-data" | null = null;
            if (requestBody) {
                let typeNode: ts.TypeNode = ts.factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword);

                const applicationJson = JSONSchema.resolveRefObject(requestBody.content["application/json"], document);
                if (applicationJson && applicationJson.schema) {
                    typeNode = JSONSchema.toTypeScriptAST(applicationJson.schema);
                    contentType = "application/json";
                }

                const formData = JSONSchema.resolveRefObject(requestBody.content["multipart/form-data"], document);
                if (formData && formData.schema) {
                    typeNode = ts.factory.createUnionTypeNode([JSONSchema.toTypeScriptAST(formData.schema), ts.factory.createTypeReferenceNode("FormData")]);
                    contentType = "multipart/form-data";
                }

                requestProperties.push(
                    ts.factory.createPropertySignature(
                        undefined,
                        "body",
                        requestBody.required ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                        typeNode
                    )
                );
            }

            // ======== Path Params ========
            const pathParams = parameters.filter(parameter => parameter.in === "path");
            const pathRequired = pathParams.some(item => item.required);
            const pathProperties = pathParams.map(parameterToTypeScriptAST);

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

            if (queryProperties.length > 0) {
                requestProperties.push(ts.factory.createPropertySignature(
                    undefined,
                    "query",
                    queryRequired ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                    ts.factory.createTypeLiteralNode(queryProperties)
                ));
            }

            // ======== Header Params ========
            const headerParams = parameters.filter(parameter => parameter.in === "header");
            const headerRequired = headerParams.some(item => item.required);
            const headerProperties = headerParams.map(parameterToTypeScriptAST);
            
            if (headerProperties.length > 0) {
                requestProperties.push(ts.factory.createPropertySignature(
                    undefined,
                    "header",
                    headerRequired ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                    ts.factory.createTypeLiteralNode(headerProperties)
                ));
            }
            
            // ======== RequestInit ========
            requestProperties.push(
                ts.factory.createPropertySignature(
                    undefined,
                    "request",
                    ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                    ts.factory.createTypeReferenceNode("RequestInit")
                )
            );


            // ===== Init Type =====
            const initRequired = bodyRequired || pathRequired || queryRequired || headerRequired;
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
                            // We assume "default" responses are errors. This
                            // is a willful spec deviation, as the
                            // specification does not say whether "default"
                            // responses are successful or error responses.
                            errorTypes.push(typeNode);
                        } else if (Number(statusCode) >= 200 && Number(statusCode) < 300) {
                            successTypes.push(typeNode);
                        } else {
                            errorTypes.push(typeNode);
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
                            ts.factory.createStringLiteral(method.toLocaleUpperCase()),
                            ts.factory.createStringLiteral(path),
                            ts.factory.createIdentifier("init"),
                            contentType ? ts.factory.createStringLiteral(contentType) : null
                        ].filter(value => value !== null)
                    ))],
                    true
                )
            );

            JSONSchema.annotate(methodNode, operation, `\`${method.toUpperCase()} ${path}\``);

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

    ast.unshift(clientNode);

    return ast;
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

function parameterToTypeScriptAST(item: OpenAPIV3.ParameterObject | OpenAPIV2.InBodyParameterObject | OpenAPIV2.GeneralParameterObject) {
    const property = ts.factory.createPropertySignature(
        undefined,
        JSONSchema.isUnsafeName(item.name) ? ts.factory.createStringLiteral(item.name) : item.name,
        item.required ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
        item.schema ? JSONSchema.toTypeScriptAST(item.schema) : ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
    );

    JSONSchema.annotate(property, item.schema ? { ...item.schema, ...item } : item);
    
    return property;
}

export function documentToTypeNodes(document: OpenAPIDocument): ts.Node[] {
    if ("components" in document && document.components) {
        const components = document.components;
        if (components.schemas) {
            const schemas = components.schemas;

            return Object.keys(schemas).map(schemaName => {
                const schema = schemas[schemaName];

                const node = ts.factory.createTypeAliasDeclaration(
                    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                    JSONSchema.toSafeName(schemaName),
                    undefined,
                    JSONSchema.toTypeScriptAST(schema)
                );

                JSONSchema.annotate(node, schema);

                return node;
            });
        }
    }

    return [];
}