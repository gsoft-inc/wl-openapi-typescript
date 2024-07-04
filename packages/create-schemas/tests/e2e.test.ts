import { readFile } from "node:fs/promises";
import {
    createTemporaryFolder,
    dataFolder,
    runCompiledBin
} from "./fixtures.ts";
import { describe, test } from "vitest";
import { join } from "node:path";

const timeout = 30 * 1000; // 30 seconds

describe.concurrent("e2e", () => {
    test(
        "officevice.yaml",
        async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            const source = join(dataFolder, "officevice.yaml");
            const output = join(tempFolder, "output.ts");

            await runCompiledBin({ source, output });

            const result = await readFile(output, "utf-8");

            expect(result).toMatchSnapshot();
        },
        timeout
    );

    test(
        "petstore.json",
        async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            const source = join(dataFolder, "petstore.json");
            const output = join(tempFolder, "output.ts");

            await runCompiledBin({ source, output });

            const result = await readFile(output, "utf-8");

            expect(result).toMatchSnapshot();
        },
        timeout
    );
});
