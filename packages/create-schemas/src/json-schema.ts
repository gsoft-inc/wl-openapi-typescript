import type { JSONSchema7 } from "json-schema";
import ts from "typescript";

/**
 * Ref: https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01
 */
export function toTypeScriptAST(schema: JSONSchema7 | boolean): ts.TypeNode {
    if (typeof schema === "boolean") {
        throw new Error("Boolean schema is not supported");
    }

    if (schema.$ref !== undefined) {
        const identifer = refToIdentifier(schema.$ref);

        return ts.factory.createTypeReferenceNode(identifer);
    }

    if (schema.oneOf !== undefined) {
        const typeNodes = schema.oneOf.map(toTypeScriptAST);

        return ts.factory.createUnionTypeNode(typeNodes);
    }

    if (schema.allOf !== undefined) {
        const typeNodes = schema.allOf.map(toTypeScriptAST);

        return ts.factory.createIntersectionTypeNode(typeNodes);
    }

    if (schema.anyOf !== undefined) {
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

    if ("type" in schema) {
        if (Array.isArray(schema.type)) {
            for (const type of schema.type) {
                return toTypeScriptAST({ ...schema, type });
            }
        }

        if (schema.type === "null") {
            return ts.factory.createLiteralTypeNode(ts.factory.createNull());
        }

        // Ref: https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.5
        if (schema.type === "object") {
            const properties = schema.properties || {};
    
            const propertySignatures = Object.keys(properties).map(name => {
                const property = properties[name];

                if (typeof property === "boolean") {
                    throw new Error("Boolean schema is not supported");
                }

                const propertyType = toTypeScriptAST(property);

                const modifiers: ts.Modifier[] = [];

                if (schema.readOnly === true) {
                    modifiers.push(ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword));
                }

                const optional = schema.required && !schema.required.includes(name);

                const propertySignature = ts.factory.createPropertySignature(
                    modifiers,
                    isUnsafeName(name) ? ts.factory.createStringLiteral(name) : name,
                    optional
                        ? ts.factory.createToken(ts.SyntaxKind.QuestionToken)
                        : undefined,
                    propertyType
                );
    
                annotate(propertySignature, property);
    
                return propertySignature;
            });
    
            return ts.factory.createTypeLiteralNode(propertySignatures);
        }
    
        if (schema.type === "string") {
            const typeNodes = [];
            if (schema.enum) {
                for (const literalValue of schema.enum) {
                    typeNodes.push(
                        ts.factory.createLiteralTypeNode(
                            ts.factory.createStringLiteral(literalValue as string)
                        )
                    );
                }
            } else {
                typeNodes.push(
                    ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                );
            }
    
            if (typeNodes.length === 1) {
                return typeNodes[0];
            } else {
                return ts.factory.createUnionTypeNode(typeNodes);
            }
        }
    
        if (schema.type === "integer" || schema.type === "number") {
            const typeNodes = [];
    
            if (schema.enum) {
                for (const numericLiteral of schema.enum) {
                    typeNodes.push(
                        ts.factory.createLiteralTypeNode(
                            ts.factory.createNumericLiteral(numericLiteral as number)
                        )
                    );
                }
            } else {
                typeNodes.push(
                    ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
                );
            }
    
            if (typeNodes.length === 1) {
                return typeNodes[0];
            } else {
                return ts.factory.createUnionTypeNode(typeNodes);
            }
        }
    
        if (schema.type === "boolean") {
            const typeNodes = [];
    
            if (schema.enum) {
                for (const booleanLiteral of schema.enum) {
                    if (booleanLiteral === true) {
                        typeNodes.push(
                            ts.factory.createLiteralTypeNode(ts.factory.createTrue())
                        );
                    }
    
                    if (booleanLiteral === false) {
                        typeNodes.push(
                            ts.factory.createLiteralTypeNode(ts.factory.createFalse())
                        );
                    }
                }
            } else {
                typeNodes.push(
                    ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
                );
            }
    
            if (typeNodes.length === 1) {
                return typeNodes[0];
            } else {
                return ts.factory.createUnionTypeNode(typeNodes);
            }
        }
    
        // Ref: https://datatracker.ietf.org/doc/html/draft-handrews-json-schema-validation-01#section-6.4
        if (schema.type === "array") {
            if (schema.items) {
                if (Array.isArray(schema.items)) {
                    const itemTypes = schema.items.map(toTypeScriptAST);

                    return ts.factory.createArrayTypeNode(ts.factory.createTupleTypeNode(itemTypes));
                } else {
                    const itemType = toTypeScriptAST(schema.items);

                    return ts.factory.createArrayTypeNode(itemType);
                }
            } else {
                return ts.factory.createArrayTypeNode(
                    ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
                );
            }
        }
    }

    throw new Error(`Unsupported type: ${schema.type} from schema: ${JSON.stringify(schema)}`);
}

/** Adds properties of schema to the type node as comment. */
export function annotate(typeNode: ts.Node, schema: JSONSchema7, ...additionalComments: string[]) {
    const comments: string[] = [...additionalComments.flatMap(comment => comment.split("\n"))];
    if (schema.description) {
        comments.push(schema.description);
    }
    if ("summary" in schema && typeof schema.summary === "string") {
        comments.push(schema.summary);
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
    return !/^[a-zA-Z0-9\\.\-_]+$/.test(unsafeName);
}

export function refToIdentifier(ref: string) {
    const [protocol, ...parts] = ref.split("/");

    if (protocol !== "#") {
        throw new Error(`Unsupported protocol: "${protocol}" in ref "${ref}"`);
    }

    const name = parts.pop()!;

    return toSafeName(name);
}