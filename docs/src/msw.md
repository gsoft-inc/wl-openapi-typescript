---
icon: <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.8 21.1H5.2a2.7 2.7 0 0 1-2.7-3L4.3 3.7h5.4l10 11.2.1 6.2Zm-12-14-1 10h10.1l-9.1-10Z" fill-opacity=".5"/><path d="M5.1 3.2h14.6l1 .4.7.7.4.8c.2.4.2.7.1 1.1l-1.5 14.3c-.2.5-.2.6-.6 1l-.9.8c-.5.2-1 .3-1.6.2-.5-.2-.8-.2-1.2-.6L3.3 8C1.8 6 3 3.2 5.1 3.1Zm11.7 13.6 1-9.6H8.2l8.7 9.6Z"/></svg>
label: Mock Service Worker
order: -6
---

# Mock Service Worker

## Type-safe Handlers

The [`experimental_openapiMSWPlugin` plugin](/using-plugins/#experimental_openapimswplugin) allows you to define MSW handlers in a type-safe way.

To use this client, you need to install the [`openapi-msw`](https://www.npmjs.com/package/openapi-msw) package:

+++ pnpm
```bash
pnpm add openapi-msw
```
+++ npm
```bash
npm install openapi-msw
```
+++ yarn
```bash
yarn add openapi-msw
```
+++

**Example usage:**

```ts #2,5 create-schemas.config.ts 
import { defineConfig } from "@workleap/create-schemas";
import { experimental_openapiMSWPlugin } from "@workleap/create-schemas/plugins";

export default defineConfig({
    plugins: [experimental_openapiMSWPlugin()]
    input: "v1.yaml",
    outdir: "codegen",
});
```

```ts #5-6
import { http } from "./codegen/openapi-msw.ts";

export const handlers = [
    http.get("/good-vibes-points/{userId}", ({ response }) => {
        return response(200).json({ pointx: 50 });
                                 // ^^^^^^ Property "pointx" does not exist on type { points: number }
    }),
];
```

## Auto-generated handlers

*Soon...*

See https://source.mswjs.io/