import type { Plugin } from "./plugin.ts";
import { getRelativeModuleResolutionExtension } from "../utils.ts";
import { openapiTypeScriptId } from "./openapi-typescript-plugin.ts";

export function unstable_openapiMSWPlugin(): Plugin {
    return {
        name: "openapi-fetch-plugin",
        async transform({ id, emitFile }) {
            if (id !== openapiTypeScriptId) {
                return;
            }

            const importsFileExtension = getRelativeModuleResolutionExtension();

            emitFile({
                filename: "openapi-msw.ts",
                code: [
                    `import type { paths } from "./types${importsFileExtension}";`,
                    "import { createOpenApiHttp } from \"openapi-msw\";",
                    "export const http = createOpenApiHttp<paths>();"
                ].join("\n")
            });
        }
    };
}