import { Worker } from "node:worker_threads";
import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { OnTestFailedHandler } from "vitest";
import { toFullyQualifiedURL } from "../src/utils.ts";
import type { GenerationFile } from "../src/generate.ts"; 

const tempFolder = fileURLToPath(
    new URL("../node_modules/.tmp", import.meta.url)
);
export const dataFolder = fileURLToPath(new URL("./data", import.meta.url));

interface CreateTemporaryFolderOptions {
    onTestFinished: (fn: OnTestFailedHandler) => void;
}

export async function createTemporaryFolder({
    onTestFinished
}: CreateTemporaryFolderOptions): Promise<string> {
    const id = crypto.randomUUID();
    const path = join(tempFolder, id);

    await mkdir(path, { recursive: true });
    onTestFinished(() => rm(path, { recursive: true }));

    return path;
}

interface BinOptions {
    source: string;
    outdir: string;
    cwd?: string;
}

export async function runCompiledBin(options: BinOptions): Promise<GenerationFile[]> {
    const binUrl = new URL("../bin/create-schemas.js", import.meta.url);

    const cwdArgs = options.cwd ? ["--cwd", options.cwd] : [];

    const worker = new Worker(binUrl, {
        argv: [options.source, "-o", options.outdir, ...cwdArgs]
    });

    await new Promise((resolve, reject) => {
        worker.on("exit", resolve);
        worker.on("error", reject);
    });

    const outdir = fileURLToPath(toFullyQualifiedURL(options.outdir));

    const filenames = await readdir(outdir);
    const files = await Promise.all(
        filenames.map(async filename => ({
            filename,
            code: await readFile(join(outdir, filename), "utf8")
        } satisfies GenerationFile))
    );
    
    return files;
}