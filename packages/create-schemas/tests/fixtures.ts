import { Worker } from "node:worker_threads";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { OnTestFailedHandler } from "vitest";

const tempFolder = join(process.cwd(), "node_modules", ".tmp");
export const dataFolder = join(process.cwd(), "tests", "data");

interface CreateTemporaryFolderOptions {
    onTestFinished: (fn: OnTestFailedHandler) => void;
}

export async function createTemporaryFolder({
    onTestFinished
}: CreateTemporaryFolderOptions): Promise<string> {
    const id = Math.random().toString(36).substring(2);
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
    const binPath = pathToFileURL(require.resolve("../dist/bin.js"));

    const worker = new Worker(binPath, {
        argv: [options.source, "-o", options.output],
        stdout: false
    });

    return new Promise((resolve, reject) => {
        worker.on("exit", resolve);
        worker.on("error", reject);
    });
}
