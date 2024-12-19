import { readFile } from "fs/promises";
import type { Plugin } from "./plugin.ts";
import YAML from "yaml";
import { fileURLToPath } from "url";
import type { OpenAPIDocument } from "../types.ts";

export function loaderPlugin(): Plugin {
    return {
        name: "internal:loader-plugin",
        async load(options) {
            const url = new URL(options.url);

            if (url.protocol === "http:" || url.protocol === "https:") {
                const response = await fetch(url);
      
                return response.json() as Promise<OpenAPIDocument>;
            } 
            
            if (url.protocol === "file:") {
                const path = fileURLToPath(url);
      
                return YAML.parse(await readFile(path, "utf-8")) as OpenAPIDocument;
            }
        }
    };
}