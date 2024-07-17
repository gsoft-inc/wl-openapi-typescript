import type { JSONSchema7 } from "json-schema";
import ts from "typescript";

export function JSONSchemaToTypeScriptAST(schema: JSONSchema7): ts.TypeNode {
    if ("type" in schema) {
        if (Array.isArray(schema.type)) {
            for (const type of schema.type) {
                return JSONSchemaToTypeScriptAST({ ...schema, type });
            }
        }

        if (schema.type === "null") {
            return ts.factory.createLiteralTypeNode(ts.factory.createNull());
        }

        if (schema.type === "object") {
            const properties = schema.properties || {};
    
            const propertySignatures = Object.keys(properties).map(name => {
                const property = properties[name] as JSONSchema7;
                const propertyType = JSONSchemaToTypeScriptAST(property);
    
                const optional = schema.required && !schema.required.includes(name);
    
                const propertySignature = ts.factory.createPropertySignature(
                    undefined,
                    toSafeName(name),
                    optional
                        ? ts.factory.createToken(ts.SyntaxKind.QuestionToken)
                        : undefined,
                    propertyType
                );
    
                const comments = [];
                if ("description" in property) {
                    comments.push(property.description);
                }
                if ("format" in property) {
                    comments.push(`@format \`${property.format}\``);
                }
                if ("deprecated" in property && property.deprecated === true) {
                    comments.push("@deprecated");
                }
    
                if (comments.length > 0) {
                    if (comments.length === 1) {
                    /** Single line comment */
                        annotate(propertySignature, comments[0]!);
                    } else {
                    /**
                     * Multi line comment
                     */
                        annotate(propertySignature, `\n * ${comments.join("\n * ")}\n`);
                    }
                }
    
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
    
        if (schema.type === "array") {
            if (schema.items) {
                const itemType = JSONSchemaToTypeScriptAST(schema.items as JSONSchema7);
    
                return ts.factory.createArrayTypeNode(itemType);
            } else {
                return ts.factory.createArrayTypeNode(
                    ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
                );
            }
        }
    }

    throw new Error(`Unsupported type: ${schema.type}`);
}

function annotate(node: ts.Node, comment: string) {
    ts.addSyntheticLeadingComment(
        node,
        ts.SyntaxKind.MultiLineCommentTrivia,
        `* ${comment} `,
        true
    );
}

export function toSafeName(name: string): string {
    let formattedName = "";
    for (const char of name) {
        const digitsAllowed = formattedName.length > 0;

        // Removes the accents from the characters
        const normalizedChar = char
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        const charCode = normalizedChar.charCodeAt(0);

        // A-Z
        if (charCode >= 65 && charCode <= 90) {
            formattedName += char;
        }

        // a-z
        if (charCode >= 97 && charCode <= 122) {
            formattedName += char;
        }

        if (char === "_" || char === "$") {
            formattedName += char;
        }

        // 0-9
        if (digitsAllowed && charCode >= 48 && charCode <= 57) {
            formattedName += char;
        }

        continue;
    }

    return formattedName;
}