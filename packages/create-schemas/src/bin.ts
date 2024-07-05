import { ZodError } from "zod";
import { parseArgs, resolveConfig } from "./config.ts";
import { generateSchemas } from "./openapiTypescriptHelper.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

try {
    // Access command-line arguments
    const config = await resolveConfig(parseArgs());

    const contents = await generateSchemas(config);

    // Write the content to a file
    mkdirSync(dirname(fileURLToPath(config.output)), { recursive: true });
    writeFileSync(fileURLToPath(config.output), contents);
} catch (error) {
    if (error instanceof ZodError) {
        printConfigurationErrors(error);
    } else {
        throw error;
    }
}

function printConfigurationErrors(error: ZodError) {
    console.log("Invalid configuration:");
    error.errors.forEach((issue) => {
        console.log(` - ${issue.path.join(".")}: ${issue.message}`);
    });
    console.log("Use --help to see available options.");
}
