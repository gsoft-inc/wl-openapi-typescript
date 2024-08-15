import type { ResolvedConfig } from "./config.ts";
import type { OpenAPIDocument } from "./types.ts";

export interface GenerationResult {
    duration: number;
    files: GenerationFile[];
}

export interface GenerationFile {
    id?: unknown;
    filename: string;
    code: string;
}

export async function generate(config: ResolvedConfig): Promise<GenerationResult> {
    const start = Date.now();

    const files: GenerationFile[] = [];

    function emitFile(file: GenerationFile) {
        files.push(file);
    }

    // ====== Load ======
    let document: OpenAPIDocument | undefined = undefined;
    for (const plugin of config.plugins) {
        if (plugin.load) {
            const loadResult = await plugin.load({
                config,
                url: config.input
            });
            if (loadResult) {
                document = loadResult;
                break;
            }
        }
    }

    if (!document) {
        throw new Error(`Failed to load OpenAPI document: "${config.input}"`);
    }

    // ====== Build start ======
    await Promise.all(config.plugins.map(async plugin => {
        if (plugin.buildStart) {
            await plugin.buildStart({ config, emitFile, document });
        }
    }));

    // ====== Transform ======
    for (const file of files) {
        for (const plugin of config.plugins) {
            if (plugin.transform) {
                const transformResult = await plugin.transform({
                    ...file,
                    config,
                    emitFile
                });
                if (transformResult) {
                    file.code = transformResult.code;
                }
            }
        }
    }

    // ====== Build end ======
    await Promise.all(config.plugins.map(async plugin => {
        if (plugin.buildEnd) {
            await plugin.buildEnd({ config, files });
        }
    }));

    const end = Date.now();

    return {
        duration: end - start,
        files 
    } satisfies GenerationResult;
}
