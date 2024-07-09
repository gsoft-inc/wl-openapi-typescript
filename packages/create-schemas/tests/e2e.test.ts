import {
    createTemporaryFolder,
    dataFolder,
    runCompiledBin
} from "./fixtures.ts";
import { describe, test } from "vitest";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const timeout = 30 * 1000; // 30 seconds

describe.concurrent("e2e", () => {
    test(
        "officevice.yaml / file paths",
        async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            const result = await runCompiledBin({
                source: join(dataFolder, "officevice.yaml"),
                output: join(tempFolder, "output.ts")
            });

            expect(result).toMatchSnapshot();
        },
        timeout
    );

    test(
        "officevice.yaml / file URLs",
        async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            const result = await runCompiledBin({
                source: pathToFileURL(join(dataFolder, "officevice.yaml")).toString(),
                output: pathToFileURL(join(tempFolder, "output.ts")).toString()
            });

            expect(result).toMatchSnapshot();
        },
        timeout
    );

    test(
        "officevice.yaml / relative path",
        async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            const result = await runCompiledBin({
                cwd: dataFolder,
                source: "officevice.yaml",
                output: join(tempFolder, "output.ts")
            });

            expect(result).toMatchSnapshot();
        },
        timeout
    );

    test(
        "petstore.json",
        async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            const result = await runCompiledBin({
                source: join(dataFolder, "petstore.json"),
                output: join(tempFolder, "output.ts")
            });

            expect(result).toMatchSnapshot();
        },
        timeout
    );

    test(
        "petstore.json / remote URL",
        async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            const result = await runCompiledBin({
                source: "https://petstore3.swagger.io/api/v3/openapi.json", 
                output: join(tempFolder, "output.ts")
            });

            expect(result).toMatchSnapshot();
        },
        timeout
    );
});
