import { defineDevConfig } from "@workleap/tsup-configs";

export default defineDevConfig({
    entry: ["src/bin.ts", "src/index.ts", "src/plugins/index.ts"],
    platform: "node"
});
