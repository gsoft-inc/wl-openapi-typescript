import { defineBuildConfig } from "@workleap/tsup-configs";

export default defineBuildConfig({
    entry: ["src/bin.ts", "src/index.ts", "src/plugins/index.ts"],
    platform: "node"
});
