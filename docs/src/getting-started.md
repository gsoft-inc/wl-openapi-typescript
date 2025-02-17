---
icon: rocket
label: Getting Started
order: -1
---

# Getting Started

In your project, you can install the `create-schemas` CLI using:

+++ pnpm
```bash
pnpm add @workleap/create-schemas
```
+++ npm
```bash
npm install @workleap/create-schemas
```
+++ yarn
```bash
yarn add @workleap/create-schemas
```
+++

Create a `create-schemas.config.ts` file this this:

```js create-schemas.config.ts
import { defineConfig } from "@workleap/create-schemas";

export default defineConfig({
  input: "https://petstore3.swagger.io/api/v3/openapi.json", // replace with your own OpenAPI schema
  outdir: "src/codegen",
});
```

Then, run the `create-schemas` CLI in your terminal:

+++ pnpm
```bash
pnpm create-schemas
```
+++ npm
```bash
npx create-schemas
```
+++ yarn
```bash
yarn create-schemas
```
+++

The `src/codegen/types.ts` file should be created.

## Watch mode

During development, you can regenerate the types whenever your input file
changes or configuration changes. 

To enable watch mode, add the `--watch` flag to the CLI command or add `watch:
true` to the configuration file.

+++ pnpm
```bash
pnpm create-schemas --watch
```
+++ npm
```bash
npx create-schemas --watch
```
+++ yarn
```bash
yarn create-schemas --watch
```
+++

or

```js create-schemas.config.ts
import { defineConfig } from "@workleap/create-schemas";

export default defineConfig({
  input: "./openapi.json",
  watch: true,
});
```

## Advanced usage

If you have a more complex use case that isn't supported by
`@workleap/create-schemas` you can try extending the behavior of the library by
[Creating a Plugin](./using-plugins#creating-a-plugin) or using the [JavaScript API](./javascript-api).

If you think many users would benefit from a use case being officially supported, we encourage you to [open an issue on Github](https://github.com/workleap/wl-openapi-typescript/issues).