import { defineDevConfig } from "@workleap/tsup-configs";

export default defineDevConfig({
    entry: ["src/cli.ts", "src/index.ts", "src/plugins/index.ts"],
    platform: "node"
});
