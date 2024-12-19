import { defineBuildConfig } from "@workleap/tsup-configs";

export default defineBuildConfig({
    entry: ["src/**/*"],
    platform: "node",
    clean: true
});
