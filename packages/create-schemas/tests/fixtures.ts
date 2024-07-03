import { Worker } from "node:worker_threads";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { OnTestFailedHandler } from "vitest";

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
    output: string;
}

export async function runCompiledBin(options: BinOptions): Promise<void> {
    const binUrl = new URL("../dist/bin.js", import.meta.url);

    const worker = new Worker(binUrl, {
        argv: [options.source, "-o", options.output]
    });

    return new Promise((resolve, reject) => {
        worker.on("exit", resolve);
        worker.on("error", reject);
    });
}
