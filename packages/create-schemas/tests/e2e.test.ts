import {
    createTemporaryFolder,
    dataFolder,
    runCompiledBin
} from "./fixtures.ts";
import { assert, describe, test } from "vitest";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { openapiTypeScriptFilename } from "../src/plugins/openapi-typescript-plugin.ts";

const timeout = 30 * 1000; // 30 seconds

describe.concurrent("e2e", () => {
    test(
        "officevice.yaml / file paths",
        async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            const result = await runCompiledBin({
                source: join(dataFolder, "officevice.yaml"),
                outdir: tempFolder
            });

            const typesFile = result.find(file => file.filename === openapiTypeScriptFilename);
            assert(typesFile);
            expect(typesFile.code).toMatchSnapshot(); 
        },
        timeout
    );

    test(
        "officevice.yaml / file URLs",
        async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            const result = await runCompiledBin({
                source: pathToFileURL(join(dataFolder, "officevice.yaml")).toString(),
                outdir: tempFolder
            });

            const typesFile = result.find(file => file.filename === openapiTypeScriptFilename);
            assert(typesFile);
            expect(typesFile.code).toMatchSnapshot(); 
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
                outdir: tempFolder
            });

            const typesFile = result.find(file => file.filename === openapiTypeScriptFilename);
            assert(typesFile);
            expect(typesFile.code).toMatchSnapshot(); 
        },
        timeout
    );

    test(
        "petstore.json",
        async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            const result = await runCompiledBin({
                source: join(dataFolder, "petstore.json"),
                outdir: tempFolder
            });

            const typesFile = result.find(file => file.filename === openapiTypeScriptFilename);
            assert(typesFile);
            expect(typesFile.code).toMatchSnapshot(); 
        },
        timeout
    );

    test(
        "petstore.json / remote URL",
        async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            const result = await runCompiledBin({
                source: "https://petstore3.swagger.io/api/v3/openapi.json", 
                outdir: tempFolder
            });

            const typesFile = result.find(file => file.filename === openapiTypeScriptFilename);
            assert(typesFile);
            expect(typesFile.code).toMatchSnapshot();
        },
        timeout
    );
});
