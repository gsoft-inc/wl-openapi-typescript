import { ZodError } from "zod";
import { parseArgs, resolveConfig, type ResolvedConfig } from "./config.ts";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { watch, type Watcher } from "./watch.ts";
import { blue, bold, cyan, dim, green, red } from "kleur/colors";
import { formatBytes } from "./utils.ts";
import { generate, type GenerationResult } from "./generate.ts";

try {
    const inlineConfig = parseArgs();
    const config = await resolveConfig(inlineConfig);
    if (config.watch) {
        const watcher = await watch(inlineConfig);
        printWatchEvents(config, watcher);
    } else {
        const result = await generate(config);

        const outdir = fileURLToPath(config.outdir);
        mkdirSync(outdir, { recursive: true });
        for (const file of result.files) {
            writeFileSync(join(outdir, file.filename), file.code);
        }

        printResult(result, config);
    }
} catch (error) {
    printError(error);
}

function printConfigurationErrors(error: ZodError) {
    console.log(red("✖ Invalid configuration:"));
    error.errors.forEach(issue => {
        console.log(` - ${cyan(issue.path.reduce((text, item) => {
            if (text === "") {
                return item;
            }
            if (typeof item === "number") {
                return `${text}[${item}]`;
            }

            return `${text}.${item}`;
        }, ""))}: ${issue.message}`);
    });
    console.log(dim("Use --help to see available options."));
}

function printWatchEvents(initialConfig: ResolvedConfig, watcher: Watcher) {
    let config = initialConfig;

    printInputPath(config);

    watcher.on("change", () => {
        console.log(blue("Change detected"));
    });

    watcher.on("configChanged", newConfig => {
        console.log(blue("Configuration changed. Restarting."));
        config = newConfig;
        printInputPath(config);
    });

    watcher.on("error", error => {
        printError(error);
    });

    watcher.on("done", result => {
        printResult(result, config);
    });
}

function printInputPath(config: ResolvedConfig) {
    const inputPath = fileURLToPath(config.input);
    console.log(blue(`Watching for changes on ${prettifyPath(inputPath)}`));
    if (!existsSync(inputPath)) {
        console.log(dim(`${prettifyPath(inputPath)} does not exist.`));
    }
}

function printError(error: unknown) {
    if (error instanceof ZodError) {
        printConfigurationErrors(error);
    } else {
        console.log(red("✖ Failed to generate schemas."));
        console.log(red(String(error))); 
    }
}

function printResult(result: GenerationResult, config: ResolvedConfig) {
    console.log(`${green("✔")} Completed in ${result.duration}ms`);
    for (const file of result.files) {
        console.log(
            `    ${dim(prettifyPath(fileURLToPath(config.outdir)) + sep)}${bold(file.filename)} ${dim(
                `(${formatBytes(file.code.length)})`
            )}`
        );
    }
}

function prettifyPath(path: string) {
    return relative(process.cwd(), path);
}
