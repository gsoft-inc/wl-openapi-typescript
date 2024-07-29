import { defineBuildConfig } from "@workleap/tsup-configs";

export default defineBuildConfig({
    entry: ["src/cli.ts", "src/index.ts", "src/plugins/index.ts"],
    platform: "node"
});
