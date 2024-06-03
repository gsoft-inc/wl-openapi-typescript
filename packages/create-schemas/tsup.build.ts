import { defineBuildConfig } from "@workleap/tsup-configs";

export default defineBuildConfig({
    entry: ["src/bin.ts"],
    platform: "node"
});
