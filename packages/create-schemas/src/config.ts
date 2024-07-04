import { Command } from "commander";
import { loadConfig } from "c12";
import * as z from "zod";
import packageJson from "../package.json" with { type: "json" };
import type { OpenAPITSOptions as OriginalOpenAPITSOptions } from "openapi-typescript";

const CONFIG_FILE_DEFAULT = "create-schemas.config";
const OUTPUT_FILE_DEFAULT = "openapi-types.ts";
const ROOT_DEFAULT = process.cwd();

type OpenApiTsOptions = Omit<OriginalOpenAPITSOptions, "cwd" | "transform" | "postTransform" | "silent" | "version">;

export interface UserConfig {
    root?: string;
    input?: string;
    output?: string;
    openApiTsOptions?: OpenApiTsOptions;
}

export interface InlineConfig extends UserConfig {
    configFile?: string;
}

const resolvedConfigSchema = z.object({
    configFile: z.string(),
    root: z.string(),
    input: z.string(),
    output: z.string(),
    openApiTsOptions: z.custom<OpenApiTsOptions>().optional().default({})
});

export type ResolvedConfig = z.infer<typeof resolvedConfigSchema>;

export function parseArgs(argv?: string[]): InlineConfig {
    const program = new Command();

    program
        .name("create-schemas")
        .version(packageJson.version, "-v, --version", "display version number")
        .argument("[input]")
        .option("-c, --config <file>", "use specified config file")
        .option("-i, --input <path>", "path to the OpenAPI schema file")
        .option("-o, --output <path>", "output file path")
        .option("--cwd <path>", "path to working directory")
        .helpOption("-h, --help", "display available CLI options")
        .parse(argv);

    const opts = program.opts();
    const args = program.args;

    return {
        configFile: opts.config,
        root: opts.cwd,
        input: opts.input || args[0],
        output: opts.output
    };
}

export async function resolveConfig(inlineConfig: InlineConfig = {}): Promise<ResolvedConfig> {
    const { configFile = CONFIG_FILE_DEFAULT, root = ROOT_DEFAULT } = inlineConfig;

    const { config } = await loadConfig<InlineConfig>({
        configFile,
        cwd: root,
        rcFile: false,
        omit$Keys: true,
        defaultConfig: {
            configFile: CONFIG_FILE_DEFAULT,
            root: ROOT_DEFAULT,
            output: OUTPUT_FILE_DEFAULT
        },
        overrides: inlineConfig
    });

    const resolvedConfig = resolvedConfigSchema.parse(config);

    return resolvedConfig;
}

export function defineConfig(config: UserConfig): UserConfig {
    return config;
}