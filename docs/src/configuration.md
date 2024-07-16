---
icon: gear
label: Configuration
order: -3
---

When running `create-schemas` from the command line, it will automatically try
to resolve a config file named `create-schemas.config.ts` inside project root
(other JS and TS extensions are also supported).

The most basic config file looks like this:

```ts create-schemas.config.ts
export default {
  // config options
}
```

You can use the `defineConfig` helper which should provide intellisense:

```ts create-schemas.config.ts
import { defineConfig } from '@workleap/create-schemas'

export default defineConfig({
  // ...
})
```

### root
- **Type:** `string`
- **Default:** `process.cwd()`

Project root directory used to resolve relative paths. Can be an absolute path, or a path relative to the current working directory.

### input
- **Type:** `string`

Path to the OpenAPI schema file. Can be a local path or URL to a remote file.

### outdir
- **Type:** `string`
- **Default:** `"./dist"`

Output directory path.

### watch
- **Type:** `boolean`
- **Default:** `false`

Enable watch mode.

### openApiTsOptions

- **Type:** `OpenApiTsOptions`
- **Default:** `{}`


Options passed to OpenAPI TypeScript for type generation. You normally should
not have to change them.

[!ref target="blank" text="See OpenAPI TypeScript options"](https://openapi-ts.pages.dev/cli#flags)