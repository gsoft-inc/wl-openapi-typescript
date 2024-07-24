# @workleap/create-schemas

## 0.2.0

### Minor Changes

- [#15](https://github.com/gsoft-inc/wl-openapi-typescript/pull/15) [`b522f5d`](https://github.com/gsoft-inc/wl-openapi-typescript/commit/b522f5d2b0796d06af7b4325cd5b96eb684d59e3) Thanks [@tjosepo](https://github.com/tjosepo)! - Add watch mode

- [#16](https://github.com/gsoft-inc/wl-openapi-typescript/pull/16) [`dde9873`](https://github.com/gsoft-inc/wl-openapi-typescript/commit/dde9873fd659d32fec01ab343bbb626d1274cc1b) Thanks [@tjosepo](https://github.com/tjosepo)! - [BREAKING] `outfile` option is now `outdir`

- [#10](https://github.com/gsoft-inc/wl-openapi-typescript/pull/10) [`868734a`](https://github.com/gsoft-inc/wl-openapi-typescript/commit/868734a5ae11c8faf9a90833f96e4f47a88cfeef) Thanks [@tjosepo](https://github.com/tjosepo)! - [BREAKING] Major overhaul to configurations.

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

- [#16](https://github.com/gsoft-inc/wl-openapi-typescript/pull/16) [`dde9873`](https://github.com/gsoft-inc/wl-openapi-typescript/commit/dde9873fd659d32fec01ab343bbb626d1274cc1b) Thanks [@tjosepo](https://github.com/tjosepo)! - Add `openapiFetchPlugin` plugin for client generation (requires `openapi-fetch`
  package)

- [#16](https://github.com/gsoft-inc/wl-openapi-typescript/pull/16) [`dde9873`](https://github.com/gsoft-inc/wl-openapi-typescript/commit/dde9873fd659d32fec01ab343bbb626d1274cc1b) Thanks [@tjosepo](https://github.com/tjosepo)! - Add a new plugin system

### Patch Changes

- [#8](https://github.com/gsoft-inc/wl-openapi-typescript/pull/8) [`9d92d06`](https://github.com/gsoft-inc/wl-openapi-typescript/commit/9d92d06be15c21a784125e8be0829f7f72206cc9) Thanks [@tjosepo](https://github.com/tjosepo)! - Add changeset to project
