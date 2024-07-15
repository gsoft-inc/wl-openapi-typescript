import openapiTS, { astToString } from "openapi-typescript";
import type { Plugin } from "./plugin.ts";

export const openapiTypeScriptId = Symbol();

export function openapiTypeScriptPlugin(): Plugin {
    return {
        name: "internal:openapi-typescript-plugin",
        async buildStart({ config, emitFile }) {
            const ast = await openapiTS(new URL(config.input), {
                silent: true,
                ...config.openApiTsOptions
            });

            emitFile({
                id: openapiTypeScriptId,
                filename: "types.ts",
                code: astToString(ast)
            });
        }
    };
}
