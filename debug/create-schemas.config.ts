import { defineConfig } from "@workleap/create-schemas";
import { workleapClientPlugin } from "@workleap/create-schemas/plugins";

export default defineConfig({
    input: "v1.yaml",
    outdir: "src/codegen/v1",
    plugins: [workleapClientPlugin()],
    watch: true
});
