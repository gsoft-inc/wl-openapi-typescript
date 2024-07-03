import { defineDevConfig } from "@workleap/tsup-configs";

export default defineDevConfig({
    entry: ["src/bin.ts", "src/index.ts"],
    platform: "node"
});
