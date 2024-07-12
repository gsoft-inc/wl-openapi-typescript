import { ZodError } from "zod";
import { parseArgs, resolveConfig, type ResolvedConfig } from "./config.ts";
import { generateSchemas } from "./openapiTypescriptHelper.ts";
import { existsSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { watch, type Watcher } from "./watch.ts";
import { blue, bold, dim, green, red } from "kleur/colors";
import { formatBytes } from "./utils.ts";

try {
    const inlineConfig = parseArgs();
    const config = await resolveConfig(inlineConfig);
    if (config.watch) {
        const watcher = await watch(inlineConfig);
        printWatchEvents(config, watcher);
    } else {
        await generateSchemas(config);
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

function printWatchEvents(initialConfig: ResolvedConfig, watcher: Watcher) {
    let config = initialConfig;

    printInputPath(config);

    let start = Date.now();
    watcher.on("start", () => {
        start = Date.now();
    });

    watcher.on("change", () => {
        console.log(blue("Change detected"));
    });

    watcher.on("configChanged", newConfig => {
        console.log(blue("Configuration changed. Restarting."));
        config = newConfig;
        printInputPath(config);
    });

    watcher.on("error", error => {
        if (error instanceof ZodError) {
            printConfigurationErrors(error);
        } else {
            console.log(red("✖ Failed to generate schemas."));
            console.log(red(String(error)));
        }
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

function printInputPath(config: ResolvedConfig) {
    const inputPath = fileURLToPath(config.input);
    console.log(blue(`Watching for changes on ${prettifyPath(inputPath)}`));
    if (!existsSync(inputPath)) {
        console.log(dim(`${prettifyPath(inputPath)} does not exist.`));
    }
}

function prettifyPath(path: string) {
    return relative(process.cwd(), path);
}
