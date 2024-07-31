import { defineConfig } from "@workleap/create-schemas";
import { experimental_openapiFetchPlugin, experimental_openapiMSWPlugin } from "@workleap/create-schemas/plugins";

export default defineConfig({
    input: "v1.yaml",
    outdir: "src/codegen/v1",
    plugins: [experimental_openapiFetchPlugin(), experimental_openapiMSWPlugin()]
});
