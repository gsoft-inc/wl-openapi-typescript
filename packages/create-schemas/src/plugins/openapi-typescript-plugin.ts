import openapiTS, { astToString, type OpenAPI3 } from "openapi-typescript";
import type { Plugin } from "./plugin.ts";

export const openapiTypeScriptId = "internal:openapi-typescript-plugin";

export const openapiTypeScriptFilename = "types.ts";

export function openapiTypeScriptPlugin(): Plugin {
    return {
        name: "internal:openapi-typescript-plugin",
        async buildStart({ config, emitFile, document }) {
            const ast = await openapiTS(document as OpenAPI3, {
                silent: true,
                ...config.openApiTsOptions
            });

            emitFile({
                id: openapiTypeScriptId,
                filename: openapiTypeScriptFilename,
                code: astToString(ast)
            });
        }
    };
}
