import { fileURLToPath } from "node:url";
import {
    resolveConfig,
    type InlineConfig,
    type ResolvedConfig
} from "./config.ts";
import { watch as fsWatch } from "chokidar";
import { generateSchemas } from "./openapiTypescriptHelper.ts";
import { dirname } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

interface WatcherEventMap {
    start: () => void;
    stop: () => void;
    done: (result: string) => void;
    error: (error: unknown) => void;
}

export class BuildWatcher {
    #listeners = new Map<keyof WatcherEventMap, Set<WatcherEventMap[keyof WatcherEventMap]>>();

    on<T extends keyof WatcherEventMap>(
        event: T,
        listener: WatcherEventMap[T]
    ): void {
        let listeners = this.#listeners.get(event);
        if (!listeners) {
            listeners = new Set();
            this.#listeners.set(event, listeners);
        }
        listeners.add(listener);
    }

    once<T extends keyof WatcherEventMap>(
        event: T,
        listener: WatcherEventMap[T]
    ): void {
        const cleanup = () => {
            this.off(event, listener);
            this.off(event, cleanup);
        };
        this.on(event, listener);
        this.on(event, cleanup);
    }

    off<T extends keyof WatcherEventMap>(
        event: T,
        listener: WatcherEventMap[T]
    ): void {
        const listeners = this.#listeners.get(event);
        if (listeners) {
            listeners.delete(listener);
        }
    }

    dispatch<T extends keyof WatcherEventMap>(
        event: T,
        data: Parameters<WatcherEventMap[T]>[0]
    ): void {
        const listeners = this.#listeners.get(event) as Set<WatcherEventMap[T]>;

        if (!listeners) {
            return;
        }

        for (const listener of listeners) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            listener(data as any);
        }
    }

    stop(): void {
        this.dispatch("stop", undefined);
    }
}

export async function watch(config: InlineConfig): Promise<BuildWatcher> {
    return watchResolved(await resolveConfig(config));
}

export function watchResolved(config: ResolvedConfig): BuildWatcher {
    if (new URL(config.input).protocol !== "file:") {
        throw new Error("Can only watch local file.");
    }

    const notifier = new BuildWatcher();

    const watcher = fsWatch(fileURLToPath(config.input));

    async function generate() {
        try {
            notifier.dispatch("start", undefined);
            const contents = await generateSchemas(config);

            // Write the content to a file
            mkdirSync(dirname(fileURLToPath(config.output)), { recursive: true });
            writeFileSync(fileURLToPath(config.output), contents);
            notifier.dispatch("done", contents);
        } catch (e) {
            notifier.dispatch("error", e);
        }
    }

    watcher.on("change", () => generate());
    watcher.on("add", () => generate());

    notifier.on("stop", () => watcher.close());

    return notifier;
}
