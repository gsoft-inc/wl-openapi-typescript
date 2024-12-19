import { copyFile } from "node:fs/promises";
import { createTemporaryFolder, dataFolder } from "./fixtures.ts";
import { assert, describe, test } from "vitest";
import { join } from "node:path";
import { watch } from "../src/watch.ts";
import type { GenerationResult } from "../src/generate.ts";
import { openapiTypeScriptFilename } from "../src/plugins/openapi-typescript-plugin.ts";

describe("watch", () => {
    // TODO: Test is flaky... doesn't trigger rebuilds consistently
    test("changing the input", { todo: true }, async ({ expect, onTestFinished }) => {
        // Setup
        const tempFolder = await createTemporaryFolder({ onTestFinished });

        const input = join(tempFolder, "input.json");

        const watcher = await watch({ input, outdir: tempFolder });
        onTestFinished(() => watcher.stop());

        // 1st output
        await copyFile(join(dataFolder, "petstore.json"), input);
        let result = await new Promise<GenerationResult>(resolve => watcher.once("done", resolve));
        let typesFile = result.files.find(file => file.filename === openapiTypeScriptFilename);
        assert(typesFile);
        expect(typesFile.code).toMatchSnapshot();

        // Create delay to ensure the file system watcher is ready
        await new Promise(resolve => setTimeout(resolve, 500));

        // 2nd output
        const promise = new Promise<GenerationResult>(resolve => watcher.once("done", resolve));
        await copyFile(join(dataFolder, "todo.json"), input);
        result = await promise;
        typesFile = result.files.find(file => file.filename === openapiTypeScriptFilename);
        assert(typesFile);
        expect(typesFile.code).toMatchSnapshot();
    });
});
