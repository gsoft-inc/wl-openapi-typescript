---
icon: terminal
label: CLI
order: -2
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
| `-o, --outdir <path>` | Output directory (default: `"./dist"`) |
| `--cwd <path>` | Path to working directory (default: `"."`) |
| `--watch` | Enable watch mode |
| `-h, --help` | Display available CLI options |