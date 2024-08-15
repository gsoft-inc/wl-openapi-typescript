import { defineDevConfig } from "@workleap/tsup-configs";

export default defineDevConfig({
    entry: ["src/**/*"],
    platform: "node",
    clean: true
});
