# @workleap/create-schemas

## 0.3.0

### Minor Changes

- [#23](https://github.com/workleap/wl-openapi-typescript/pull/23) [`f2f35a7`](https://github.com/workleap/wl-openapi-typescript/commit/f2f35a7908e1c04dc05ac504158815b1202683ad) Thanks [@tjosepo](https://github.com/tjosepo)! - Add `experimental_openapiMSWPlugin`

- [#23](https://github.com/workleap/wl-openapi-typescript/pull/23) [`f2f35a7`](https://github.com/workleap/wl-openapi-typescript/commit/f2f35a7908e1c04dc05ac504158815b1202683ad) Thanks [@tjosepo](https://github.com/tjosepo)! - [BREAKING] Rename `openapiFetchPlugin` to `experimental_openapiFetchPlugin`

### Patch Changes

- [#24](https://github.com/workleap/wl-openapi-typescript/pull/24) [`3c6be50`](https://github.com/workleap/wl-openapi-typescript/commit/3c6be50da3b2df13fa56cbca3ab503d66ddc7b41) Thanks [@tjosepo](https://github.com/tjosepo)! - Only include build output in package when published

## 0.2.0

### Minor Changes

- [#15](https://github.com/workleap/wl-openapi-typescript/pull/15) [`b522f5d`](https://github.com/workleap/wl-openapi-typescript/commit/b522f5d2b0796d06af7b4325cd5b96eb684d59e3) Thanks [@tjosepo](https://github.com/tjosepo)! - Add watch mode

- [#16](https://github.com/workleap/wl-openapi-typescript/pull/16) [`dde9873`](https://github.com/workleap/wl-openapi-typescript/commit/dde9873fd659d32fec01ab343bbb626d1274cc1b) Thanks [@tjosepo](https://github.com/tjosepo)! - [BREAKING] `outfile` option is now `outdir`

- [#10](https://github.com/workleap/wl-openapi-typescript/pull/10) [`868734a`](https://github.com/workleap/wl-openapi-typescript/commit/868734a5ae11c8faf9a90833f96e4f47a88cfeef) Thanks [@tjosepo](https://github.com/tjosepo)! - [BREAKING] Major overhaul to configurations.

  The following command line arguments are no longer supported:

  - `--additionalProperties`
  - `--alphabetize`
  - `--arrayLength`
  - `--defaultNonNullable`
  - `--propertiesRequiredByDefault`
  - `--emptyObjectsUnknown`
  - `--enum`
  - `--enumValues`
  - `--excludeDeprecated`
  - `--exportType`
  - `--help`
  - `--immutable`
  - `--pathParamsAsTypes`

  These options now need to be declared in the `create-schemas.config.ts` file using the `openApiTsOptions` property.

- [#16](https://github.com/workleap/wl-openapi-typescript/pull/16) [`dde9873`](https://github.com/workleap/wl-openapi-typescript/commit/dde9873fd659d32fec01ab343bbb626d1274cc1b) Thanks [@tjosepo](https://github.com/tjosepo)! - Add `openapiFetchPlugin` plugin for client generation (requires `openapi-fetch`
  package)

- [#16](https://github.com/workleap/wl-openapi-typescript/pull/16) [`dde9873`](https://github.com/workleap/wl-openapi-typescript/commit/dde9873fd659d32fec01ab343bbb626d1274cc1b) Thanks [@tjosepo](https://github.com/tjosepo)! - Add a new plugin system

### Patch Changes

- [#8](https://github.com/workleap/wl-openapi-typescript/pull/8) [`9d92d06`](https://github.com/workleap/wl-openapi-typescript/commit/9d92d06be15c21a784125e8be0829f7f72206cc9) Thanks [@tjosepo](https://github.com/tjosepo)! - Add changeset to project
