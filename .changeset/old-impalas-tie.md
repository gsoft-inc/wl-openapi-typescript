---
"@workleap/create-schemas": minor
---

[BREAKING] Major overhaul to configurations.

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