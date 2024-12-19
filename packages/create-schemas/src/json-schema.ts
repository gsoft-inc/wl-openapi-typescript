import ts from "typescript";
import type { ReferenceObject, SchemaObject } from "./types.ts";

/**
 * Ref: https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01
 */
export function toTypeScriptAST(schema: SchemaObject | ReferenceObject | boolean | Record<string, never>): ts.TypeNode {
    // Ref: https://json-schema.org/draft/2020-12/json-schema-core#name-boolean-json-schemas
    if (schema === true) {
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    } 
    
    if (schema === false) {
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword);
    }

    if ("$ref" in schema && typeof schema.$ref === "string") {
        return ts.factory.createTypeReferenceNode(refToIdentifier(schema.$ref));
    }

    if (Object.keys(schema).length === 0) {
        // Empty object "{}" is the shorthand for `any` type in JSON Schema
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    }

    if ("const" in schema && schema.const) {
        // OpenAPI 3.1 only
        return literalValueToTypeScriptAST(schema.const);
    }

    if ("oneOf" in schema && schema.oneOf) {
        // OpenAPI >=3.0
        return ts.factory.createUnionTypeNode(schema.oneOf.map(toTypeScriptAST));
    }

    if ("allOf" in schema && schema.allOf) {
        // OpenAPI >=3.0
        return ts.factory.createIntersectionTypeNode(schema.allOf.map(toTypeScriptAST));
    }

    if ("anyOf" in schema && schema.anyOf) {
        // OpenAPI >=3.0
        const typeNodes = schema.anyOf.map(toTypeScriptAST);

        const typeCombination = combinations(typeNodes).map(combos => {
            if (combos.length === 1) {
                return combos[0];
            } else {
                return ts.factory.createIntersectionTypeNode(combos);
            }
        });

        return ts.factory.createUnionTypeNode(typeCombination);
    }

    if ("nullable" in schema && schema.nullable === true) {
        // OpenAPI 2.0 & 3.0 only
        const nonNullableSchema = { ...schema };

        delete nonNullableSchema.nullable;

        return ts.factory.createUnionTypeNode([
            toTypeScriptAST(nonNullableSchema),
            ts.factory.createLiteralTypeNode(ts.factory.createNull())
        ]);
    }

    if ("type" in schema && schema.type) {
        if (Array.isArray(schema.type)) {
            // OpenAPI 3.1 only
            return ts.factory.createUnionTypeNode(schema.type.map(type => toTypeScriptAST({ ...schema, type } as SchemaObject)));
        }

        // Ref: https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.5
        if (schema.type === "object") {
            const propertySignatures = Object.entries(schema.properties ?? {}).map(([name, property]) => {
                const modifiers: ts.Modifier[] = [];
                if ("readOnly" in schema && schema.readOnly === true) {
                    modifiers.push(ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword));
                }

                const propertySignature = ts.factory.createPropertySignature(
                    modifiers,
                    isUnsafeName(name) ? ts.factory.createStringLiteral(name) : name,
                    isRequiredProperty(schema, name) ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                    toTypeScriptAST(property)
                );

                if ("$ref" in property === false) {
                    annotate(propertySignature, property);
                }

                return propertySignature;
            });

            if (schema.additionalProperties) {
                const additionalProperties = ts.factory.createTypeReferenceNode(
                    "Record",
                    [
                        ts.factory.createUnionTypeNode([ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)]),
                        toTypeScriptAST(schema.additionalProperties)
                    ]
                );

                if (propertySignatures.length === 0) {
                    return additionalProperties;
                } else {
                    return ts.factory.createIntersectionTypeNode([
                        ts.factory.createTypeLiteralNode(propertySignatures),
                        additionalProperties
                    ]);
                }
            }

            if (propertySignatures.length === 0) {
                // Empty object "{}" is the shorthand for `any` type in JSON Schema
                return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
            } else {
                return ts.factory.createTypeLiteralNode(propertySignatures);
            }
        }

        // Ref: https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.4
        if (schema.type === "array") {
            if (schema.items) {
                if (Array.isArray(schema.items)) {
                    return ts.factory.createArrayTypeNode(
                        ts.factory.createTupleTypeNode(
                            schema.items.map(toTypeScriptAST)
                        )
                    );
                } else {
                    return ts.factory.createArrayTypeNode(toTypeScriptAST(schema.items));
                }
            } else {
                return ts.factory.createArrayTypeNode(
                    ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
                );
            }
        }
    
        if (schema.type === "string") {
            if (schema.enum) {
                return enumToTypeScriptAST(schema.enum);
            }

            if ("format" in schema && schema.format === "binary") {
                // Ref: https://swagger.io/docs/specification/describing-request-body/file-upload/
                return ts.factory.createTypeReferenceNode("Blob");
            }

            return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
        }
    
        if (schema.type === "integer" || schema.type === "number") {
            if (schema.enum) {
                return enumToTypeScriptAST(schema.enum);
            }
 
            return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        }
    
        if (schema.type === "boolean") {
            if (schema.enum) {
                return enumToTypeScriptAST(schema.enum);
            }
 
            return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
        }

        if (schema.type === "null") {
            // OpenAPI 3.1 only
            return ts.factory.createLiteralTypeNode(ts.factory.createNull());
        }
    }

    return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
}

function literalValueToTypeScriptAST(literalValue: unknown): ts.TypeNode {
    if (literalValue === null) {
        return ts.factory.createLiteralTypeNode(ts.factory.createNull());
    } else if (typeof literalValue === "boolean") {
        return ts.factory.createLiteralTypeNode(
            literalValue ? ts.factory.createTrue() : ts.factory.createFalse()
        );
    } else if (typeof literalValue === "object") {
        throw new Error("Object literal as enum is not supported");
    } else if (typeof literalValue === "number") {
        return ts.factory.createLiteralTypeNode(
            ts.factory.createNumericLiteral(literalValue)
        );
    } else if (typeof literalValue === "string") {
        return ts.factory.createLiteralTypeNode(
            ts.factory.createStringLiteral(literalValue)
        );
    }
    throw new Error(`Unsupported enum value: ${literalValue}`);
}

function enumToTypeScriptAST(enumerable: unknown[]): ts.TypeNode {
    const nodes = enumerable.map(literalValueToTypeScriptAST);

    if (nodes.length === 0) {
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword);
    } else if (nodes.length === 1) {
        return nodes[0];
    } else {
        return ts.factory.createUnionTypeNode(nodes);
    }
}

/** Adds properties of schema to the type node as comment. */
export function annotate(typeNode: ts.Node, schema: unknown, ...additionalComments: string[]) {
    const comments: string[] = [...additionalComments.flatMap(comment => comment.split("\n"))];

    if (typeof schema === "object" && schema !== null) {
        if ("description" in schema && typeof schema.description === "string") {
            if (comments.length > 0) {
                comments.push("");
            }
            comments.push(...schema.description.split("\n"));
        } else if ("summary" in schema && typeof schema.summary === "string") {
            // Only use summary as a fallback if description is not present
            if (comments.length > 0) {
                comments.push("");
            }
            comments.push(...schema.summary.split("\n"));
        }

        if ("format" in schema) {
            comments.push(`@format \`${schema.format}\``);
        }
        if ("maximum" in schema) {
            comments.push(`@maximum \`${schema.maximum}\``);
        }
        if ("minimum" in schema) {
            comments.push(`@minimum \`${schema.minimum}\``);
        }
        if ("maxItems" in schema) {
            comments.push(`@maximum \`${schema.maxItems}\``);
        }
        if ("minItems" in schema) {
            comments.push(`@minimum \`${schema.minItems}\``);
        }
        if ("default" in schema) {
            comments.push(`@defaultValue \`${schema.default}\``);
        }
        if ("deprecated" in schema && schema.deprecated === true) {
            comments.push("@deprecated");
        }
    }

    if (comments.length > 0) {
        ts.addSyntheticLeadingComment(
            typeNode,
            ts.SyntaxKind.MultiLineCommentTrivia,
            `*\n * ${comments.join("\n * ")}\n `,
            true
        );
    }
}

/**
 * OpenAPI field names must match `^[a-zA-Z0-9\.\-_]+$` which allows names that
 * are not valid JavaScript/TypeScript identifiers. This function converts an
 * unsafe name into a safe name that can be used as a JavaScript/TypeScript
 * identifier.
 */
export function toSafeName(unsafeName: string): string {
    let safeName = "";
    for (const char of unsafeName) {
        const charCode = char.charCodeAt(0);

        // A-Z
        if (charCode >= 65 && charCode <= 90) {
            safeName += char;
        }

        // a-z
        if (charCode >= 97 && charCode <= 122) {
            safeName += char;
        }

        if (char === "_" || char === "$") {
            safeName += char;
        }

        // 0-9
        if (safeName.length > 0 && charCode >= 48 && charCode <= 57) {
            safeName += char;
        }

        continue;
    }

    if (safeName.length === 0) {
        throw new Error(`Schema field ${JSON.stringify(unsafeName)} cannot be converted to a TypeScript identifier`);
    }

    return safeName;
}

export function isUnsafeName(unsafeName: string): boolean {
    return toSafeName(unsafeName) !== unsafeName;
}

function isRequiredProperty(schema: SchemaObject, propertyName: string): boolean {
    if ("nullable" in schema && schema.nullable === true) {
        return false;
    }

    if (schema.required && schema.required.includes(propertyName)) {
        return true;
    }

    return false;
}

export function refToIdentifier(ref: string) {
    const parts = refToPath(ref);

    if (parts.length === 0) {
        throw new Error(`Invalid ref: ${ref}`);
    }

    const lastPart = parts[parts.length - 1];

    return toSafeName(lastPart);
}

export function refToPath(ref: string): string[] {
    const [protocol, ...parts] = ref.split("/");

    if (protocol !== "#") {
        throw new Error(`Unsupported protocol: "${protocol}" in ref "${ref}"`);
    }

    return parts;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveRefObject<T>(refObject: T | ReferenceObject, object: Record<string, any>): T {
    if (typeof refObject === "object" && refObject !== null && "$ref" in refObject) {
        const parts = refToPath(refObject.$ref);

        return parts.reduce((acc, part) => acc[part], object) as T;
    } else {
        return refObject;
    }
}

export function printAST(node: ts.Node | ts.Node[]) {
    const resultFile = ts.createSourceFile(
        "",
        "",
        ts.ScriptTarget.Latest,
        false,
        ts.ScriptKind.TSX
    );
  
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  
    if (Array.isArray(node)) {
        const formatted = node.flatMap(n => [n, ts.factory.createIdentifier("\n") ]);

        return printer.printList(
            ts.ListFormat.MultiLine,
            ts.factory.createNodeArray(formatted, undefined),
            resultFile
        );
    }
  
    return printer.printNode(ts.EmitHint.Unspecified, node, resultFile);
}

function combinations<T>(n: T[]): T[][] {
    const combos: T[][] = [];

    for (let i = 1; i <= n.length; i++) {
        combos.push(...numberOfKCombinations(n, i));
    }

    return combos;
}

function numberOfKCombinations<T>(n: T[], k: number): T[][] {
    const combos: T[][] = [];
    
    if (k === 1) {
        return n.map(v => [v]);
    }
  
    for (let i = 0; i < n.length; i++) {
        const head = n.slice(i, i + 1);

        const tail = numberOfKCombinations(n.slice(i + 1), k - 1);
  
        for (let j = 0; j < tail.length; j++) {
            const combo = head.concat(tail[j]);
            combos.push(combo);
        }
    }

    return combos;
}
