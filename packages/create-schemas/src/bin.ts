import { ZodError } from "zod";
import {
    parseArgs,
    resolveConfig,
    type ResolvedConfig,
    watchConfig
} from "./config.ts";
import { generateSchemas } from "./openapiTypescriptHelper.ts";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { type BuildWatcher, watchResolved } from "./watch.ts";
import { blue, bold, dim, green, red } from "kleur/colors";
import { formatBytes } from "./utils.ts";

try {
    const inlineConfig = parseArgs();
    const config = await resolveConfig(inlineConfig);
    if (config.watch) {
        let watcher = watchResolved(config);
        printWatchEvents(config, watcher);

        watchConfig({
            inlineConfig,
            onChange: newConfig => {
                console.log(blue("Configuration changed. Restarting."));
                watcher?.stop();
                watcher = watchResolved(newConfig);
                printWatchEvents(newConfig, watcher);
            },
            onValidationError: error => {
                console.log(blue("Configuration changed. Restarting."));
                printConfigurationErrors(error);
            }
        });
    } else {
        const contents = await generateSchemas(config);
        mkdirSync(dirname(fileURLToPath(config.output)), { recursive: true });
        writeFileSync(fileURLToPath(config.output), contents);
    }
} catch (error) {
    if (error instanceof ZodError) {
        printConfigurationErrors(error);
    } else {
        throw error;
    }
}

function printConfigurationErrors(error: ZodError) {
    console.log("Invalid configuration:");
    error.errors.forEach(issue => {
        console.log(` - ${issue.path.join(".")}: ${issue.message}`);
    });
    console.log("Use --help to see available options.");
}

function printWatchEvents(config: ResolvedConfig, watcher: BuildWatcher) {
    const inputPath = fileURLToPath(config.input);
    console.log(blue(`Watching for changes on ${prettifyPath(inputPath)}`));
    if (!existsSync(inputPath)) {
        console.log(dim(`${prettifyPath(inputPath)} does not exist.`));
    }

    let start = Date.now();
    let firstRun = true;
    watcher.on("start", () => {
        start = Date.now();
        if (!firstRun) {
            console.log(blue("Change detected."));
        }
        firstRun = false;
    });

    watcher.on("error", error => {
        console.log(red("✖ Failed to generate schemas."));
        console.log(red(String(error)));
    });

    watcher.on("done", content => {
        const time = Date.now() - start;
        console.log(`${green("✔")} Completed in ${time}ms`);
        console.log(
            `    ${bold(prettifyPath(fileURLToPath(config.output)))} ${dim(
                `(${formatBytes(content.length)})`
            )}`
        );
    });
}

function prettifyPath(path: string) {
    return relative(process.cwd(), path);
}
