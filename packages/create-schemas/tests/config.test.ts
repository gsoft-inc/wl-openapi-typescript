import { writeFile } from "node:fs/promises";
import { createTemporaryFolder, dataFolder } from "./fixtures.ts";
import { describe, test } from "vitest";
import { join } from "node:path";
import { parseArgs, resolveConfig, type UserConfig } from "../src/config.ts";
import { ZodError } from "zod";

describe.concurrent("config", () => {
    test("parseArgs", ({ expect }) => {
        const config = parseArgs([
            "",
            "",
            "input",
            "-o",
            "output",
            "-c",
            "config",
            "--cwd",
            "cwd"
        ]);
        expect(config.input).toMatch("input");
        expect(config.output).toMatch("output");
        expect(config.configFile).toMatch("config");
        expect(config.root).toMatch("cwd");
    });

    describe.concurrent("resolveConfig", () => {
        test("inline config only", async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            const config = await resolveConfig({
                root: tempFolder,
                input: "input"
            });

            expect(config.input).toMatch("input");
        });

        test("config file only", async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            const configFilePath = join(tempFolder, "create-schemas.config.ts");
            const input = join(dataFolder, "petstore.json");
            const output = join(tempFolder, "output.ts");

            const configFileContent = `export default ${JSON.stringify({
                input,
                output
            } satisfies UserConfig)};`;

            await writeFile(configFilePath, configFileContent);

            const config = await resolveConfig({ root: tempFolder });

            expect(config.input).toMatch(input);
            expect(config.output).toMatch(output);
        });

        test("throw on invalid config", async ({ expect, onTestFinished }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            expect(() =>
                // Missing required input
                resolveConfig({ root: tempFolder })
            ).rejects.toThrowError(ZodError);
        });

        test("inline config takes precedence over config file", async ({
            expect,
            onTestFinished
        }) => {
            const tempFolder = await createTemporaryFolder({ onTestFinished });

            const configFilePath = join(tempFolder, "create-schemas.config.ts");

            const configFileContent = `export default ${JSON.stringify({
                input: "config-file-input",
                output: "config-file-output"
            } satisfies UserConfig)};`;

            await writeFile(configFilePath, configFileContent);

            const config = await resolveConfig({
                root: tempFolder,
                input: "inline-input"
            });

            expect(config.input).toMatch("inline-input");
            expect(config.output).toMatch("config-file-output");
        });
    });
});
