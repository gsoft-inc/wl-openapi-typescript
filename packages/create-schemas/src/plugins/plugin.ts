import type { ResolvedConfig } from "../config.ts";
import type { GenerationFile } from "../generate.ts";

type EmitFileFn = (file: { id?: unknown; filename: string; code: string }) => void;

export interface BuildStartContext {
    config: ResolvedConfig;
    emitFile: EmitFileFn;
}

export interface TransformContext {
    config: ResolvedConfig;
    id?: unknown;
    filename: string;
    code: string;
    emitFile: EmitFileFn;
}

export interface BuildEndContext {
    config: ResolvedConfig;
    files: GenerationFile[];
}

export interface TransformResult {
    code: string;
}

export interface Plugin {
    name: string;
    buildStart?: (context: BuildStartContext) => void | Promise<void>;
    transform?: (context: TransformContext) => TransformResult | undefined | void | Promise<TransformResult | undefined | void>;
    buildEnd?: (context: BuildEndContext) => void | Promise<void>;
}