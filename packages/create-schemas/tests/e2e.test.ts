import { readFile } from "node:fs/promises";
import {
    createTemporaryFolder,
    dataFolder,
    runCompiledBin,
} from "./fixtures.ts";
import { describe, test } from "vitest";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const timeout = 30 * 1000; // 30 seconds

describe.concurrent("e2e", () => {
    test(
        "officevice.yaml / file paths",
        async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({
                onTestFinished,
            });

            const source = join(dataFolder, "officevice.yaml");
            const output = join(tempFolder, "output.ts");

            await runCompiledBin({ source, output });

            const result = await readFile(output, "utf-8");

            expect(result).toMatchSnapshot();
        },
        timeout
    );

    test(
        "officevice.yaml / file URLs",
        async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({
                onTestFinished,
            });

            const source = pathToFileURL(join(dataFolder, "officevice.yaml"));
            const output = pathToFileURL(join(tempFolder, "output.ts"));

            await runCompiledBin({
                source: source.toString(),
                output: output.toString(),
            });

            const result = await readFile(output, "utf-8");

            expect(result).toMatchSnapshot();
        },
        timeout
    );

    test(
        "officevice.yaml / relative path",
        async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({
                onTestFinished,
            });

            const source = "officevice.yaml";
            const output = join(tempFolder, "output.ts");

            await runCompiledBin({ cwd: dataFolder, source, output });

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

    test(
        "petstore.json / remote URL",
        async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            const source = "https://petstore3.swagger.io/api/v3/openapi.json";
            const output = join(tempFolder, "output.ts");

            await runCompiledBin({ source, output });

            const result = await readFile(output, "utf-8");

            expect(result).toMatchSnapshot();
        },
        timeout
    );
});
