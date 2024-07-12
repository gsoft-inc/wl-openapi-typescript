import { isAbsolute, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function isFileURLAsText(input: string | URL): input is `file://${string}` {
    return typeof input === "string" && input.startsWith("file://");
}

function isHttpURLAsText(
    input: string
): input is `http://${string}` | `https://${string}` {
    if (!URL.canParse(input)) {
        return false;
    }

    const url = new URL(input);

    return url.protocol === "http:" || url.protocol === "https:";
}

/**
 * Converts a path into a fully qualified path URL.
 *
 * - `foo` -> `file:///path/to/cwd/foo`
 * - `https://example.com/foo` -> `https://example.com/foo`
 *
 * This format is works for both file path and HTTP URLs, but the result needs
 * to be converted to a `URL` instance or into a file path depending on the
 * usage.
 */
export function toFullyQualifiedURL(
    input: string | URL,
    root: string | URL = process.cwd()
): string {
    if (input instanceof URL) {
        return input.toString();
    }

    if (isHttpURLAsText(input)) {
        return input;
    }

    if (isFileURLAsText(input)) {
        return input;
    }

    if (isAbsolute(input)) {
        return pathToFileURL(input).toString();
    }

    if (root instanceof URL || isHttpURLAsText(root)) {
        const rootAsURL = new URL(root);

        const pathname = join(rootAsURL.pathname, input);

        return new URL(pathname, root).toString();
    }

    if (isFileURLAsText(root)) {
        const rootAsPath = fileURLToPath(root);

        return pathToFileURL(join(rootAsPath, input)).toString();
    }

    if (isAbsolute(root)) {
        return pathToFileURL(join(root, input)).toString();
    }

    return pathToFileURL(join(process.cwd(), root, input)).toString();
}

export function formatBytes(bytes: number) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const kb = bytes / 1024;
    if (kb < 1024) {
        return `${kb.toFixed(1)} KB`;
    }

    const mb = kb / 1024;
    if (mb < 1024) {
        return `${mb.toFixed(1)} MB`;
    }

    const gb = mb / 1024;

    return `${gb.toFixed(2)} GB`;
}
