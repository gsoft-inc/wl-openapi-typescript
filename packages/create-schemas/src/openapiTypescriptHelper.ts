import parser from "yargs-parser";
import openapiTS, { type OpenAPITSOptions } from "openapi-typescript";
import type ts from "typescript";


export function getOutputPath(args: string[]): string {
    const flags = parser(args, {
        string: ["output"],
        alias: {
            output: ["o"]
        }
    });

    return flags.output || "openapi-types.ts";
}

export function getOpenApiTsOptionForArgs(args: string[]): OpenAPITSOptions {
    const flags = parser(args, {
        boolean: [
            "additionalProperties",
            "alphabetize",
            "arrayLength",
            "defaultNonNullable",
            "propertiesRequiredByDefault",
            "emptyObjectsUnknown",
            "enum",
            "enumValues",
            "excludeDeprecated",
            "exportType",
            "help",
            "immutable",
            "pathParamsAsTypes"
        ],
        alias: {
            redocly: ["c"],
            exportType: ["t"]
        }
    });

    return {
        additionalProperties: flags.additionalProperties,
        alphabetize: flags.alphabetize,
        arrayLength: flags.arrayLength,
        propertiesRequiredByDefault: flags.propertiesRequiredByDefault,
        defaultNonNullable: flags.defaultNonNullable,
        emptyObjectsUnknown: flags.emptyObjectsUnknown,
        enum: flags.enum,
        enumValues: flags.enumValues,
        excludeDeprecated: flags.excludeDeprecated,
        exportType: flags.exportType,
        immutable: flags.immutable,
        pathParamsAsTypes: flags.pathParamsAsTypes
    };
}

export async function getAst(path: string, options: OpenAPITSOptions): Promise<ts.Node[]> {
    const ast = await openapiTS(new URL(path), options);

    return ast;
}
