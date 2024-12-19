import type { ResolvedConfig } from "../config.ts";
import type { GenerationFile } from "../generate.ts";
import type { OpenAPIDocument } from "../types.ts";

export interface EmittedFile { id?: unknown; filename: string; code: string }

export interface LoadContext {
    config: ResolvedConfig;
    url: string;
}

export type LoadResult = undefined | OpenAPIDocument;

export interface BuildStartContext {
    config: ResolvedConfig;
    document: OpenAPIDocument;
    emitFile: (file: EmittedFile) => void;
}

export interface TransformContext {
    config: ResolvedConfig;
    id?: unknown;
    filename: string;
    code: string;
    emitFile: (file: EmittedFile) => void;
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
    load?: (context: LoadContext) => LoadResult | Promise<LoadResult>;
    buildStart?: (context: BuildStartContext) => void | Promise<void>;
    transform?: (context: TransformContext) => TransformResult | undefined | void | Promise<TransformResult | undefined | void>;
    buildEnd?: (context: BuildEndContext) => void | Promise<void>;
}