import type { Plugin } from "../plugin.ts";
import * as JSONSchema from "../../json-schema.ts";
import ts from "typescript";
import type { OpenAPIV2, OpenAPIV3 } from "openapi-types";
import type { OpenAPIDocument, OperationObject, ReferenceObject } from "../../types.ts";

const MUTATION_METHODS = [ "post", "put", "patch", "delete" ];

interface ReactQueryPluginOptions {
    /** Exposes the underlying fetching function, so that you can make a network request without using React Query */
    shamelesslyExposeUnderlyingFetchingFunctions?: boolean;
}

export function reactQueryPlugin(options: ReactQueryPluginOptions = {}): Plugin {
    return {
        name: "react-query-plugin",
        async buildStart({ document, emitFile }) {
            const client = documentToClient(document, options);
            const types = documentToTypeNodes(document);
            const baseClientPath = "\"@workleap/create-schemas/plugins/client-plugin/base-client\"";

            emitFile({
                filename: "queries.tsx",
                code: [
                    "import { createContext, useContext } from \"react\";\n",
                    "import { useQuery, useSuspenseQuery, useMutation, type UseQueryResult, type UseQueryOptions, type UseSuspenseQueryResult, type UseMutationResult, type UseMutationOptions, type QueryKey, type QueryClient, type FetchQueryOptions, type UseSuspenseQueryOptions } from \"@tanstack/react-query\";\n",
                    `import { OpenAPIClient, internal_fetch } from ${baseClientPath};\n\n`,
                    JSONSchema.printAST(client),
                    JSONSchema.printAST(types)
                ].join("")
            });
        }
    };
}

function documentToClient(document: OpenAPIDocument, options: ReactQueryPluginOptions): ts.Node[] {
    const ast: ts.Node[] = [];

    if (!document.paths) {
        return [];
    }

    // ===== Context =====
    const contextName = capitalize(JSONSchema.toSafeName(document.info.title + "Context"));
    const contextDeclaration = toAST(`const ${contextName} = /*#__PURE__*/ createContext(new OpenAPIClient());`);
    const contextProvider = toAST(`export function ${contextName}Provider({ children, client }: { children: React.ReactNode, client: OpenAPIClient }) {
        return <${contextName}.Provider value={client}>{children}</${contextName}.Provider>;
    }`);
    ast.push(contextDeclaration, contextProvider);

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

            const names = {
                init: capitalize(name) + "Init",
                queryKey: name + "QueryKey"
            };

            // ====== Response types ======
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
                names.init,
                undefined,
                undefined,
                requestProperties
            );

            ast.push(interfaceNode);

            // ====== Fetch Function ======
            const fetchFnNode = ts.factory.createFunctionDeclaration(
                options.shamelesslyExposeUnderlyingFetchingFunctions ? [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)] : undefined,
                undefined,
                name,
                undefined,
                [ 
                    ts.factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        "client",
                        undefined,
                        ts.factory.createTypeReferenceNode("OpenAPIClient")
                    ),
                    ts.factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        "init",
                        undefined,
                        ts.factory.createTypeReferenceNode(names.init),
                        initRequired ? undefined : ts.factory.createObjectLiteralExpression([], false)
                    )
                ],
                ts.factory.createTypeReferenceNode("Promise", [
                    ts.factory.createUnionTypeNode(successTypes)
                ]),
                ts.factory.createBlock(
                    [
                        ts.factory.createReturnStatement(ts.factory.createCallExpression(
                            ts.factory.createElementAccessExpression(
                                ts.factory.createIdentifier("client"),
                                ts.factory.createIdentifier("internal_fetch")
                            ),
                            undefined,
                            [
                                ts.factory.createStringLiteral(method.toUpperCase()),
                                ts.factory.createStringLiteral(path),
                                ts.factory.createIdentifier("init"),
                                contentType ? ts.factory.createStringLiteral(contentType) : null
                            ].filter(value => value !== null)
                        ))
                    ],
                    true
                )
            );

            ast.push(fetchFnNode);

            // ====== Query Key ======
            const queryKeyFn = ts.factory.createFunctionDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                undefined,
                names.queryKey,
                undefined,
                [
                    ts.factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        "init",
                        undefined,
                        ts.factory.createTypeReferenceNode(names.init),
                        initRequired ? undefined : ts.factory.createObjectLiteralExpression([], false)
                    )
                ],
                ts.factory.createTypeReferenceNode("QueryKey"),
                ts.factory.createBlock(
                    [
                        ts.factory.createReturnStatement(ts.factory.createArrayLiteralExpression([
                            ts.factory.createStringLiteral(method),
                            ts.factory.createStringLiteral(path),
                            ts.factory.createIdentifier("init")
                        ]))
                    ],
                    true
                )
            );

            ast.push(queryKeyFn);

            // ====== Prefetch Function ======
            
            // Interface
            ast.push(ts.factory.createInterfaceDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)], 
                `Prefetch${capitalize(name)}Options`,
                undefined,
                [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(names.init), undefined)])],
                [
                    ts.factory.createPropertySignature(
                        undefined,
                        "queryOptions",
                        ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                        ts.factory.createTypeReferenceNode(
                            "Partial",
                            [ts.factory.createTypeReferenceNode("FetchQueryOptions", [
                                ts.factory.createUnionTypeNode(successTypes),
                                ts.factory.createUnionTypeNode(errorTypes)
                            ])]
                        )
                    )
                ]
            ));

            // Function
            const prefetchNode = ts.factory.createFunctionDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                undefined,
                "prefetch" + capitalize(name),
                undefined,
                [
                    ts.factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        "client",
                        undefined,
                        ts.factory.createTypeReferenceNode("OpenAPIClient")
                    ),
                    ts.factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        "queryClient",
                        undefined,
                        ts.factory.createTypeReferenceNode("QueryClient")
                    ),
                    ts.factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        "options",
                        undefined,
                        ts.factory.createTypeReferenceNode(`Prefetch${capitalize(name)}Options`),
                        initRequired ? undefined : ts.factory.createObjectLiteralExpression([], false)
                    )
                ],
                ts.factory.createTypeReferenceNode("Promise", [
                    ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword)
                ]),
                ts.factory.createBlock(
                    [
                        toAST("const { queryOptions, ...init } = options;"),
                        toAST(`
                                    return queryClient.prefetchQuery({
                                        queryKey: ${names.queryKey}(init),
                                        queryFn: () => ${name}(client, init),
                                        ...queryOptions
                                    });
                                `)
                    ],
                    true
                )
            );
            
            ast.push(prefetchNode);
           
            // ====== UseQuery Hooks ======

            // Interface
            ast.push(ts.factory.createInterfaceDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)], 
                `Use${capitalize(name)}QueryOptions`,
                undefined,
                [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(names.init), undefined)])],
                [
                    ts.factory.createPropertySignature(
                        undefined,
                        "queryOptions",
                        ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                        ts.factory.createTypeReferenceNode(
                            "Partial",
                            [ts.factory.createTypeReferenceNode("UseQueryOptions", [
                                ts.factory.createUnionTypeNode(successTypes),
                                ts.factory.createUnionTypeNode(errorTypes)
                            ])]
                        )
                    )
                ]
            ));

            // Function
            const useQueryNode = ts.factory.createFunctionDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                undefined,
                `use${capitalize(name)}Query`,
                undefined,
                [
                    ts.factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        "options",
                        undefined,
                        ts.factory.createTypeReferenceNode(`Use${capitalize(name)}QueryOptions`),
                        initRequired ? undefined : ts.factory.createObjectLiteralExpression([], false)
                    )
                ],
                ts.factory.createTypeReferenceNode("UseQueryResult", [
                    ts.factory.createUnionTypeNode(successTypes),
                    ts.factory.createUnionTypeNode(errorTypes)
                ]),
                ts.factory.createBlock(
                    [
                        toAST("const { queryOptions, ...init } = options;"),
                        toAST(`const client = useContext(${contextName})`),
                        toAST(`
                            return useQuery({
                                queryKey: ${names.queryKey}(init),
                                queryFn: () => ${name}(client, init),
                                ...queryOptions
                            });
                        `)
                    ],
                    true
                )
            );
            
            JSONSchema.annotate(useQueryNode, operation, `\`${method.toUpperCase()} ${path}\``);

            ast.push(useQueryNode);

            // ====== UseSuspenseQuery Hooks ======

            // Interface
            ast.push(ts.factory.createInterfaceDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)], 
                `Use${capitalize(name)}SuspenseQueryOptions`,
                undefined,
                [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(names.init), undefined)])],
                [
                    ts.factory.createPropertySignature(
                        undefined,
                        "queryOptions",
                        ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                        ts.factory.createTypeReferenceNode(
                            "Partial",
                            [ts.factory.createTypeReferenceNode("UseSuspenseQueryOptions", [
                                ts.factory.createUnionTypeNode(successTypes),
                                ts.factory.createUnionTypeNode(errorTypes)
                            ])]
                        )
                    )
                ]
            ));
            
            // Function
            const useSuspenseQueryNode = ts.factory.createFunctionDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                undefined,
                `use${capitalize(name)}SuspenseQuery`,
                undefined,
                [
                    ts.factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        "options",
                        undefined,
                        ts.factory.createTypeReferenceNode(`Use${capitalize(name)}SuspenseQueryOptions`),
                        initRequired ? undefined : ts.factory.createObjectLiteralExpression([], false)
                    )
                ],
                ts.factory.createTypeReferenceNode("UseSuspenseQueryResult", [
                    ts.factory.createUnionTypeNode(successTypes),
                    ts.factory.createUnionTypeNode(errorTypes)
                ]),
                ts.factory.createBlock(
                    [
                        toAST("const { queryOptions, ...init } = options"),
                        toAST(`const client = useContext(${contextName})`),
                        toAST(`
                                    return useSuspenseQuery({
                                        queryKey: ${names.queryKey}(init),
                                        queryFn: () => ${name}(client, init),
                                        ...queryOptions
                                    });
                                `)
                    ],
                    true
                )
            );
            
            JSONSchema.annotate(useSuspenseQueryNode, operation, `\`${method.toUpperCase()} ${path}\``);

            ast.push(useSuspenseQueryNode);

            // ====== UseMutation Hooks ======
            if (MUTATION_METHODS.includes(method)) {
                const useMutationNode = ts.factory.createFunctionDeclaration(
                    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                    undefined,
                    "use" + capitalize(name) + "Mutation",
                    undefined,
                    [
                        ts.factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            "options",
                            undefined,
                            ts.factory.createTypeReferenceNode(
                                "Partial",
                                [ts.factory.createTypeReferenceNode("UseMutationOptions", [
                                    ts.factory.createUnionTypeNode(successTypes),
                                    ts.factory.createUnionTypeNode(errorTypes),
                                    ts.factory.createTypeReferenceNode(names.init)
                                ])]
                            ),
                            ts.factory.createObjectLiteralExpression()
                        )
                    ],
                    ts.factory.createTypeReferenceNode("UseMutationResult", [
                        ts.factory.createUnionTypeNode(successTypes),
                        ts.factory.createUnionTypeNode(errorTypes),
                        ts.factory.createTypeReferenceNode(names.init)
                    ]),
                    ts.factory.createBlock(
                        [
                            toAST(`const client = useContext(${contextName})`),
                            ts.factory.createReturnStatement(ts.factory.createCallExpression(
                                ts.factory.createIdentifier("useMutation"), 
                                undefined,
                                [ts.factory.createObjectLiteralExpression([
                                    ts.factory.createPropertyAssignment(
                                        ts.factory.createIdentifier("mutationFn"),
                                        ts.factory.createArrowFunction(
                                            undefined,
                                            undefined,
                                            [ts.factory.createParameterDeclaration(
                                                undefined,
                                                undefined,
                                                "init",
                                                undefined,
                                                ts.factory.createTypeReferenceNode(names.init),
                                                initRequired ? undefined : ts.factory.createObjectLiteralExpression([], false)
                                            )],
                                            undefined,
                                            ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                                            ts.factory.createCallExpression(
                                                ts.factory.createIdentifier(name),
                                                undefined,
                                                [
                                                    ts.factory.createIdentifier("client"),
                                                    ts.factory.createIdentifier("init")
                                                ]
                                            )
                                        )),
                                    ts.factory.createSpreadAssignment(ts.factory.createIdentifier("options"))
                                ], true)]
                            ))],
                        true
                    )
                );

                JSONSchema.annotate(useMutationNode, operation, `\`${method.toUpperCase()} ${path}\``);

                ast.push(useMutationNode);
            }
        }
    }

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

export function toAST(code: string) {
    return ts.createSourceFile(
        "",
        code,
        ts.ScriptTarget.Latest,
        false,
        ts.ScriptKind.TSX
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
}