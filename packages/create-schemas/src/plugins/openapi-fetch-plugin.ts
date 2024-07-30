import type { Plugin } from "./plugin.ts";
import { getRelativeModuleResolutionExtension } from "../utils.ts";
import { openapiTypeScriptId } from "./openapi-typescript-plugin.ts";

export function experimental_openapiFetchPlugin(): Plugin {
    return {
        name: "openapi-fetch-plugin",
        async transform({ id, emitFile }) {
            if (id !== openapiTypeScriptId) {
                return;
            }

            const importsFileExtension = getRelativeModuleResolutionExtension();

            emitFile({
                filename: "client.ts",
                code: [
                    `import type { paths } from "./types${importsFileExtension}";`,
                    "import _createClient from \"openapi-fetch\";\n",
                    "export const createClient = _createClient as typeof _createClient<paths, \"application/json\">;"
                ].join("\n")
            });
        }
    };
}