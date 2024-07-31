import { getRelativeModuleResolutionExtension } from "../utils.ts";
import { openapiTypeScriptId } from "./openapi-typescript-plugin.ts";
import type { Plugin } from "./plugin.ts";

export function experimental_openapiMSWPlugin(): Plugin {
    return {
        name: "openapi-msw-plugin",
        async transform({ id, emitFile }) {
            if (id !== openapiTypeScriptId) {
                return;
            }

            const importsFileExtension = getRelativeModuleResolutionExtension();

            emitFile({
                filename: "openapi-msw.ts",
                code: [
                    `import type { paths } from "./types${importsFileExtension}";`,
                    "import { createOpenApiHttp } from \"openapi-msw\";\n",
                    "export const http = createOpenApiHttp<paths>();"
                ].join("\n")
            });
        }
    };
}