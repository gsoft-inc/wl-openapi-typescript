import { Command } from "commander";
import { loadConfig, watchConfig as c12WatchConfig } from "c12";
import * as z from "zod";
import packageJson from "../package.json" with { type: "json" };
import type { OpenAPITSOptions as OriginalOpenAPITSOptions } from "openapi-typescript";
import { toFullyQualifiedURL } from "./utils.ts";

const DEFAULT_CONFIG: InlineConfig = {
    configFile: "create-schemas.config",
    output: "openapi-types.ts",
    root: process.cwd()
} as const;

type OpenApiTsOptions = Omit<OriginalOpenAPITSOptions, "transform" | "postTransform" | "silent" | "version">;

export interface UserConfig {
    root?: string;
    input?: string;
    output?: string;
    watch?: boolean;
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
    watch: z.boolean().optional().default(false),
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
        .option("--watch", "watch for changes")
        .option("--cwd <path>", "path to working directory")
        .helpOption("-h, --help", "display available CLI options")
        .parse(argv);

    const opts = program.opts();
    const args = program.args;

    return {
        configFile: opts.config,
        root: opts.cwd,
        input: opts.input || args[0],
        watch: opts.watch,
        output: opts.output
    };
}

export async function resolveConfig(inlineConfig: InlineConfig = {}): Promise<ResolvedConfig> {
    const { configFile = DEFAULT_CONFIG.configFile, root = DEFAULT_CONFIG.root } = inlineConfig;

    const { config } = await loadConfig<InlineConfig>({
        configFile,
        cwd: root,
        rcFile: false,
        omit$Keys: true,
        defaultConfig: DEFAULT_CONFIG,
        overrides: inlineConfig
    });

    return validateConfig(config);
}

interface WatchConfigOptions {
    inlineConfig?: InlineConfig;
    onChange: (newConfig: ResolvedConfig) => void;
    onValidationError?: (error: z.ZodError) => void;
}

export function watchConfig({ inlineConfig = {}, onChange, onValidationError }: WatchConfigOptions) {
    const { configFile = DEFAULT_CONFIG.configFile, root = DEFAULT_CONFIG.root } = inlineConfig;

    c12WatchConfig<InlineConfig>({
        configFile,
        cwd: root,
        rcFile: false,
        omit$Keys: true,
        defaultConfig: DEFAULT_CONFIG,
        overrides: inlineConfig,
        onUpdate: ({ newConfig }) => {
            try {
                const resolvedConfig = validateConfig(newConfig.config);
                onChange(resolvedConfig);
            } catch (error) {
                if (onValidationError && error instanceof z.ZodError) {
                    onValidationError(error);
                }
            }
        }
    });
}

function validateConfig(config: InlineConfig): ResolvedConfig {
    const resolvedConfig = resolvedConfigSchema.parse(config);

    resolvedConfig.root = toFullyQualifiedURL(resolvedConfig.root);
    resolvedConfig.input = toFullyQualifiedURL(resolvedConfig.input, resolvedConfig.root);
    resolvedConfig.output = toFullyQualifiedURL(resolvedConfig.output, resolvedConfig.root);

    return resolvedConfig;
}

export function defineConfig(config: UserConfig): UserConfig {
    return config;
}