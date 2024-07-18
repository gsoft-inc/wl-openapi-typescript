---
icon: code
label: JavaScript API
order: -5
---

The JavaScript API allows you to use the features of `@workleap/create-schemas`
in any Node.js script.

## `resolveConfig`

**Type signature:**

```ts
async function resolveConfig(config?: InlineConfig): Promise<ResolvedConfig>;
```

**Description:**

Finds, loads, and validates user configurations. You can call this function
many times and it will always return the latest user configuration.

This function converts all paths into fully qualified URLs, meaning a relative
path like `./swagger.json` will turn into `file:///path/to/cwd/swagger.json`.
You will most likely have to use `fileURLToPath` from the `node:url` module or
the `URL` class depending on how you plan to use the path.

**Example usage:**

```ts
import { resolveConfig } from "@workleap/create-schemas";

const config = await resolveConfig({
  configFile: "./config.ts",
  input: "./swagger.json",
});
```


## `generate`

**Type signature:**

```ts
async function generate(config: ResolvedConfig): Promise<GenerationResult>;
```

**Example usage:**

```ts
import { resolveConfig } from "@workleap/create-schemas";
import { mkdir, writeFile } from "node:fs/promises";

// Load the configuration
const config = await resolveConfig({
  configFile: "./config.ts",
  input: "./swagger.json",
});

// Generate the code
const result = await generate(config);

// Write the files to disk
const outdir = fileURLToPath(config.outdir);
await mkdir(outdir, { recursive: true });
for (const file of result.files) {
  await writeFile(join(outdir, file.filename), file.code);
}
```

## `watch`

**Type signature:**

```ts
async function watch(config?: InlineConfig): Promise<Watcher>;
```

**Example usage:**

```ts
import { watch } from "@workleap/create-schemas";

// Create the watcher
const watcher = await watch({
  configFile: "./config.ts",
  input: "./swagger.json",
});

// Hook into the generation process
watcher.on("change", () => {
  console.log("Code changed");
});

watcher.on("configChanged", (error) => {
  console.log("Config changed");
});

watcher.on("error", (error) => {
  console.log(`Error: ${String(error)}`);
});

watcher.on("done", (result) => {
  console.log(`Files generated in ${result.duration}ms`)
});

// Stop watching
watcher.stop();
```