import { defineConfig } from "@workleap/create-schemas";
import { openapiFetchPlugin, unstable_openapiMSWPlugin } from "@workleap/create-schemas/plugins";

export default defineConfig({
    input: "v1.yaml",
    outdir: "src/codegen/v1",
    plugins: [openapiFetchPlugin(), unstable_openapiMSWPlugin()]
});
