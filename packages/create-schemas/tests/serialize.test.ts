import { describe, expect, test } from "vitest";
import { serializeQuery } from "../src/openapi.ts";

describe("serializeQuery", () => {
    test("style=form, explode=true, id=5", () => {
        const result = serializeQuery({ id: 5 });
        expect(result).toBe("id=5");
    });

    test("style=form, explode=true, id=[3,4,5]", () => {
        const result = serializeQuery({ id: [3, 4, 5] });
        expect(result).toBe("id=3&id=4&id=5");
    });

    test("style=form, explode=true, id={\"role\": \"admin\", \"firstName\": \"Alex\"}", () => {
        const result = serializeQuery({ id: { role: "admin", firstName: "Alex" } });
        expect(result).toBe("role=admin&firstName=Alex");
    });

    test("style=form, explode=false, id=5", () => {
        const result = serializeQuery({ id: 5 }, { explode: false });
        expect(result).toBe("id=5");
    });

    test("style=form, explode=false, id=[3,4,5]", () => {
        const result = serializeQuery({ id: [3, 4, 5] }, { explode: false });
        expect(result).toBe("id=3,4,5");
    });

    test("style=form, explode=false, id={\"role\": \"admin\", \"firstName\": \"Alex\"}", () => {
        const result = serializeQuery({ id: { role: "admin", firstName: "Alex" } }, { explode: false });
        expect(result).toBe("id=role,admin,firstName,Alex");
    });


    test("style=spaceDelimited, explode=true, id=[3,4,5]", () => {
        const result = serializeQuery({ id: [3, 4, 5] }, { style: "spaceDelimited" });
        expect(result).toBe("id=3&id=4&id=5");
    });

    test("style=spaceDelimited, explode=false, id=[3,4,5]", () => {
        const result = serializeQuery({ id: [3, 4, 5] }, { style: "spaceDelimited", explode: false });
        expect(result).toBe("id=3%204%205");
    });
    test("style=pipeDelimited, explode=true, id=[3,4,5]", () => {
        const result = serializeQuery({ id: [3, 4, 5] }, { style: "pipeDelimited" });
        expect(result).toBe("id=3&id=4&id=5");
    });

    test("style=pipeDelimited, explode=false, id=[3,4,5]", () => {
        const result = serializeQuery({ id: [3, 4, 5] }, { style: "pipeDelimited", explode: false });
        expect(result).toBe("id=3|4|5");
    });

    test("style=deepObject, explode=true, id={\"role\": \"admin\", \"firstName\": \"Alex\"}", () => {
        const result = serializeQuery({ id: { role: "admin", firstName: "Alex" } }, { style: "deepObject" });
        expect(result).toBe("id[role]=admin&id[firstName]=Alex");
    });
});