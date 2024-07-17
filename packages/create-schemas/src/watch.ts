import { fileURLToPath } from "node:url";
import {
    resolveConfig,
    watchConfig,
    type InlineConfig,
    type ResolvedConfig
} from "./config.ts";
import { watch as fsWatch } from "chokidar";
import { generate, type GenerationResult } from "./generate.ts";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface WatcherEventMap {
    start: () => void;
    change: () => void;
    stop: () => void;
    configChanged: (newConfig: ResolvedConfig) => void;
    done: (result: GenerationResult) => void;
    error: (error: unknown) => void;
}

export class Watcher {
    #listeners = new Map<keyof WatcherEventMap, Set<WatcherEventMap[keyof WatcherEventMap]>>();

    on<T extends keyof WatcherEventMap>(event: T, listener: WatcherEventMap[T]): void {
        let listeners = this.#listeners.get(event);
        if (!listeners) {
            listeners = new Set();
            this.#listeners.set(event, listeners);
        }
        listeners.add(listener);
    }

    once<T extends keyof WatcherEventMap>(event: T, listener: WatcherEventMap[T]): void {
        const cleanup = () => {
            this.off(event, listener);
            this.off(event, cleanup);
        };
        this.on(event, listener);
        this.on(event, cleanup);
    }

    off<T extends keyof WatcherEventMap>(event: T, listener: WatcherEventMap[T]): void {
        const listeners = this.#listeners.get(event);
        if (listeners) {
            listeners.delete(listener);
        }
    }

    dispatch<T extends keyof WatcherEventMap>(event: T, ...args: Parameters<WatcherEventMap[T]>): void {
        const listeners = this.#listeners.get(event) as Set<(...argv: typeof args) => void>;

        if (!listeners) {
            return;
        }

        for (const listener of listeners) {
            listener(...args);
        }
    }

    stop(): void {
        this.dispatch("stop");
    }
}

export async function watch(inlineConfig: InlineConfig): Promise<Watcher> {
    const watcher = new Watcher();
    const resolvedConfig = await resolveConfig(inlineConfig);
    watchInput(watcher, resolvedConfig);
    watchConfig({
        inlineConfig,
        onChange(newConfig) {
            watcher.stop();
            watcher.dispatch("configChanged", newConfig);
            watchInput(watcher, newConfig);
        },
        onValidationError(error) {
            watcher.dispatch("error", error);
        }
    });

    return watcher;
}

function watchInput(watcher: Watcher, config: ResolvedConfig) {
    if (new URL(config.input).protocol !== "file:") {
        throw new Error("Can only watch local file.");
    }

    const inputWatcher = fsWatch(fileURLToPath(config.input));

    async function _generate() {
        try {
            watcher.dispatch("start");
            const result = await generate(config);
            await mkdir(fileURLToPath(config.outdir), { recursive: true });
            await Promise.all(result.files.map(async file => {
                return writeFile(join(fileURLToPath(config.outdir), file.filename), file.code);
            }));
            watcher.dispatch("done", result);
        } catch (e) {
            watcher.dispatch("error", e);
        }
    }

    _generate().then(() => {
        inputWatcher.on("change", () => {
            watcher.dispatch("change");
            _generate();
        });

        inputWatcher.on("add", () => _generate());
    });

    watcher.once("stop", () => inputWatcher.close());
}
