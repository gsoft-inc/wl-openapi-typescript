import type { JSONSchema7, JSONSchema7Type } from "json-schema";
import ts from "typescript";

/**
 * Ref: https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01
 */
export function toTypeScriptAST(schema: JSONSchema7 | boolean): ts.TypeNode {
    // Ref: https://json-schema.org/draft/2020-12/json-schema-core#name-boolean-json-schemas
    if (schema === true) {
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    } 
    
    if (schema === false) {
        return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword);
    }

    if (schema.const) {
        return literalValueToTypeScriptAST(schema.const);
    }

    if (schema.$ref) {
        return ts.factory.createTypeReferenceNode(refToIdentifier(schema.$ref));
    }

    if (schema.oneOf) {
        return ts.factory.createUnionTypeNode(schema.oneOf.map(toTypeScriptAST));
    }

    if (schema.allOf) {
        return ts.factory.createIntersectionTypeNode(schema.allOf.map(toTypeScriptAST));
    }

    if (schema.anyOf) {
        const typeNodes = schema.anyOf.map(toTypeScriptAST);

        const combinations = [];
        for (let i = 0; i < typeNodes.length; i++) {
            for (let j = i + 1; j < typeNodes.length; j++) {
                combinations.push(
                    ts.factory.createIntersectionTypeNode([typeNodes[i], typeNodes[j]])
                );
            }
        }

        return ts.factory.createUnionTypeNode([...typeNodes, ...combinations]);
    }

    // This is an OpenAPI extension on top of JSON Schema
    if ("nullable" in schema && schema.nullable === true) {
        const nonNullableSchema = { ...schema };

        delete nonNullableSchema.nullable;

        return ts.factory.createUnionTypeNode([
            toTypeScriptAST(nonNullableSchema),
            ts.factory.createLiteralTypeNode(ts.factory.createNull())
        ]);
    }

    if (schema.type) {
        if (Array.isArray(schema.type)) {
            return ts.factory.createUnionTypeNode(schema.type.map(type => toTypeScriptAST({ ...schema, type })));
        }

        if (typeof schema.type === "object" && "$ref" in schema.type) {
            return toTypeScriptAST(schema.type);
        }

        // Ref: https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.5
        if (schema.type === "object") {
            const propertySignatures = Object.entries(schema.properties ?? {}).map(([name, property]) => {
                const modifiers: ts.Modifier[] = [];
                if (schema.readOnly === true) {
                    modifiers.push(ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword));
                }

                const propertySignature = ts.factory.createPropertySignature(
                    modifiers,
                    isUnsafeName(name) ? ts.factory.createStringLiteral(name) : name,
                    isRequiredProperty(schema, name) ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                    toTypeScriptAST(property)
                );

                if (typeof property === "object") {
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
            return ts.factory.createLiteralTypeNode(ts.factory.createNull());
        }
    }

    return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
}

function literalValueToTypeScriptAST(literalValue: JSONSchema7Type): ts.TypeNode {
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

function enumToTypeScriptAST(enumerable: JSONSchema7Type[]): ts.TypeNode {
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
export function annotate(typeNode: ts.Node, schema: JSONSchema7, ...additionalComments: string[]) {
    const comments: string[] = [...additionalComments.flatMap(comment => comment.split("\n"))];

    if (schema.description) {
        comments.push(...schema.description.split("\n"));
    } else if ("summary" in schema && typeof schema.summary === "string") {
        // Only use summary as a fallback if description is not present
        comments.push(...schema.summary.split("\n"));
    }

    if (schema.format) {
        comments.push(`@format \`${schema.format}\``);
    }
    if (schema.maximum) {
        comments.push(`@maximum \`${schema.maximum}\``);
    }
    if (schema.minimum) {
        comments.push(`@minimum \`${schema.minimum}\``);
    }
    if (schema.maxItems) {
        comments.push(`@maximum \`${schema.maxItems}\``);
    }
    if (schema.minItems) {
        comments.push(`@minimum \`${schema.minItems}\``);
    }
    if (schema.default) {
        comments.push(`@defaultValue \`${schema.default}\``);
    }
    if ("deprecated" in schema && schema.deprecated === true) {
        comments.push("@deprecated");
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

function isRequiredProperty(schema: JSONSchema7, propertyName: string): boolean {
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

export function printAST(node: ts.Node | ts.Node[]) {
    const resultFile = ts.createSourceFile(
        "",
        "",
        ts.ScriptTarget.Latest,
        false,
        ts.ScriptKind.TS
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