---
icon: rocket
label: Getting Started
order: -100
---

# Getting Started

In your project, you can install the `create-schemas` CLI using:

+++ npm
```bash
npm install @workleap/create-schemas
```
+++ yarn
```bash
yarn add @workleap/create-schemas
```
+++ pnpm
```bash
pnpm add @workleap/create-schemas
```
+++

Create a `create-schemas.config.ts` file this this:

```js create-schemas.config.ts
import { defineConfig } from "@workleap/create-schemas";

export default defineConfig({
  input: "https://petstore.swagger.io/v2/swagger.json", // replace with your own OpenAPI schema
  output: "src/codegen/schema.ts",
});
```

Then, run the `create-schemas` CLI in your terminal:

+++ npm
```bash
npx create-schemas
```
+++ yarn
```bash
yarn create-schemas
```
+++ pnpm
```bash
pnpm create-schemas
```
+++

The `src/codegen/schema.ts` file should be created.