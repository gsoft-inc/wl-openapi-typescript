import { defineConfig } from "@workleap/create-schemas";
import { openapiFetchPlugin } from "@workleap/create-schemas/plugins";

export default defineConfig({
    input: "v1.yaml",
    outdir: "src/codegen/v1",
    plugins: [openapiFetchPlugin()]
});
