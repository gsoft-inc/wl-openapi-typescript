import { fileURLToPath } from "node:url";
import {
    resolveConfig,
    watchConfig,
    type InlineConfig,
    type ResolvedConfig
} from "./config.ts";
import { watch as fsWatch } from "chokidar";
import { generateSchemas } from "./openapiTypescriptHelper.ts";

interface WatcherEventMap {
    start: () => void;
    change: () => void;
    stop: () => void;
    configChanged: (newConfig: ResolvedConfig) => void;
    done: (result: string) => void;
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

    async function generate() {
        try {
            watcher.dispatch("start");
            const contents = await generateSchemas(config);
            watcher.dispatch("done", contents);
        } catch (e) {
            watcher.dispatch("error", e);
        }
    }

    generate().then(() => {
        inputWatcher.on("change", () => {
            watcher.dispatch("change");
            generate();
        });

        inputWatcher.on("add", () => generate());
    });

    watcher.once("stop", () => inputWatcher.close());
}
