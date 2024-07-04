---
icon: terminal
label: CLI
order: -200
---

# Command Line Interface

### `create-schemas`

#### Usage

```bash
create-schemas [input]
```

#### Options

Options passed to the CLI will always take precedence over options declared in
the config file.

| Options | Description |
|-|-|
| `-v, --version` | Display version number |
| `-c, --config <file>` | Use specified config file (default: `"create-schemas.config"`) |
| `-i, --input <path>` | Path to the OpenAPI schema file |
| `-o, --output <path>` | Output file path (default: `"openapi-types.ts"`)
| `--cwd <path>` | Path to working directory (default: `"."`)
| `-h, --help` | Display available CLI options