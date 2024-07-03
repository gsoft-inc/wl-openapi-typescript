---
icon: terminal
label: CLI
---

# Command Line Interface

### `create-schemas`

#### Usage

```bash
create-schemas [input]
```

#### Options

| Options | Description |
|-|-|
| `-v, --version` | Display version number |
| `-c, --config <file>` | Use specified config file (default: `"create-schemas.config"`) |
| `-i, --input <path>` | Path to the OpenAPI schema file |
| `-o, --output <path>` | Output file path (default: `"openapi-types.ts"`)
| `--cwd <path>` | Path to working directory (default: `"."`)
| `-h, --help` | Display available CLI options