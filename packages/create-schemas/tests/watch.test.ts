import { copyFile, readFile } from "node:fs/promises";
import { createTemporaryFolder, dataFolder } from "./fixtures.ts";
import { describe, test } from "vitest";
import { join } from "node:path";
import { watch } from "../src/watch.ts";

describe("watch", () => {
    test("changing the input", async ({ expect, onTestFinished }) => {
        // Setup
        const tempFolder = await createTemporaryFolder({ onTestFinished });

        const input = join(tempFolder, "input.json");
        const output = join(tempFolder, "output.ts");

        const watcher = await watch({ input, output });
        onTestFinished(() => watcher.stop());

        // 1st output
        await copyFile(join(dataFolder, "petstore.json"), input);
        await new Promise(resolve => watcher.once("done", resolve));
        let result = await readFile(output, "utf-8");
        expect(result).toMatchSnapshot();

        // 2nd output
        await copyFile(join(dataFolder, "todo.json"), input);
        await new Promise(resolve => watcher.once("done", resolve));
        result = await readFile(output, "utf-8");
        expect(result).toMatchSnapshot();
    });
});
