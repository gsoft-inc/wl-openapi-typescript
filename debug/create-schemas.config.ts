import { defineConfig } from "@workleap/create-schemas";
import { reactQueryPlugin } from "@workleap/create-schemas/plugins";

export default defineConfig({
    input: "openai.yaml",
    outdir: "src/codegen/v1",
    plugins: [reactQueryPlugin()]
});
