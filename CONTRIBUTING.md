# Contributing

The following documentation is for the maintainers of this repository.

## How Develop Locally

### Installation

This project uses PNPM, therefore, you must [install PNPM](https://pnpm.io/installation):

To install the project, open a terminal at the root of the workspace and execute the following command:

```bash
pnpm install
```

## Working with `@workleap/create-schemas`

### Run the CLI

To build it for development, from the `root` folder, run

```bash
pnpm dev
```

This will build the project in development mode and link the binary locally. Once done, you will be able to run it from a terminal:

```bash
create-schemas [path_to_openapi_documents] -o [output-path]
```

### Debug

1. Execute the command `pnpm dev` to have hot-reload of changes
2. Add breakpoints
3. In VSCode use the launch settings `Debug Create-Schemas`


## How to release packages

This is a very basic and soon to be improved flow:

1. Update package.json version
2. Merge in main
3. Create Release with a tag with the same version as package.json

## Commands

From the project root, you have access to many commands, the main ones are:

### dev

Build the packages for development and link them to be called from the local terminal.

```bash
pnpm dev
```

### build

Build the packages for release.

```bash
pnpm build
```

### clean

Build and release the packages inside `./packages`

```bash
pnpm release
```

### lint

Lint the packages files.

```bash
pnpm lint
```

#### Linting errors

If you got linting error, most of the time, they can be fixed automatically using `pnpm eslint-fix`, if not, follow the report provided by `pnpm lint`.

### clean/reset

Clean the packages (delete `dist` folders, clear caches, etc..) and reset monorepo installation (delete `dist` folders, clear caches, delete `node_modules` folders, etc..)

Recommended when switching branches.

```bash
pnpm reset
```
