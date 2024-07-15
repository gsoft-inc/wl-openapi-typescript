import { copyFile } from "node:fs/promises";
import { createTemporaryFolder, dataFolder } from "./fixtures.ts";
import { assert, describe, test } from "vitest";
import { join } from "node:path";
import { watch } from "../src/watch.ts";
import type { GenerationResult } from "../src/generate.ts";

describe("watch", () => {
    test("changing the input", async ({ expect, onTestFinished }) => {
        // Setup
        const tempFolder = await createTemporaryFolder({ onTestFinished });

        const input = join(tempFolder, "input.json");

        const watcher = await watch({ input, outdir: tempFolder });
        onTestFinished(() => watcher.stop());

        // 1st output
        await copyFile(join(dataFolder, "petstore.json"), input);
        let result = await new Promise<GenerationResult>(resolve => watcher.once("done", resolve));
        let typesFile = result.files.find(file => file.filename === "types.ts");
        assert(typesFile);
        expect(typesFile.code).toMatchSnapshot();

        // 2nd output
        await copyFile(join(dataFolder, "todo.json"), input);
        result = await new Promise<GenerationResult>(resolve => watcher.once("done", resolve));
        typesFile = result.files.find(file => file.filename === "types.ts");
        assert(typesFile);
        expect(typesFile.code).toMatchSnapshot();
    });
});
