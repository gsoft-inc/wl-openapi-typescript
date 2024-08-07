interface SerializeQueryOptions {
    style?: "form" | "spaceDelimited" | "pipeDelimited" | "deepObject";
    explode?: boolean;
}

/** Ref: https://swagger.io/docs/specification/serialization/#query */
export function serializeQuery(query: Record<string, unknown>, options: SerializeQueryOptions = {}) {
    const { style = "form", explode = true } = options;
    const searchParams = new Set<{ key: string; value: string }>();
    for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
            if (explode) {
                for (const item of value) {
                    searchParams.add({ key, value: item.toString() });
                }
            } else {
                if (style === "form") {
                    searchParams.add({ key, value: value.join(",") });
                } else if (style === "spaceDelimited") {
                    searchParams.add({ key, value: value.join("%20") });
                } else if (style === "pipeDelimited") {
                    searchParams.add({ key, value: value.join("|") });
                }
            }
            continue;
        }

        if (typeof value === "object" && value !== null) {
            if (style === "form") {
                if (explode) {
                    for (const [subKey, subValue] of Object.entries(value)) {
                        searchParams.add({ key: subKey, value: subValue });
                    }
                } else {
                    searchParams.add({ key, value: Object.entries(value).flatMap(([subKey, subValue]) => [subKey, subValue]).join(",") });
                }
            } else if (style === "deepObject") {
                if (explode) {
                    for (const [subKey, subValue] of Object.entries(value)) {
                        searchParams.add({ key: `${key}[${subKey}]`, value: subValue });
                    }
                }
            }
            continue;
        }

        searchParams.add({ key, value: String(value) });
    }

    return [...searchParams.entries()]
        .map(([{ key, value }]) => `${key}=${value}`)
        .join("&");
}