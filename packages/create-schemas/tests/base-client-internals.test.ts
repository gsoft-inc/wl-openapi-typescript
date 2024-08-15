import { describe, expect, test } from "vitest";
import { mergeHeaders, buildURL, serializeBody, serializeQuery } from "../src/plugins/client-plugin/base-client-internals.ts";

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


describe("buildURL", () => {
    test("/todo/{id}?format=text", () => {
        const url = buildURL("/todo/{id}", { id: "123" }, { format: "text" });
        expect(url).toBe("/todo/123?format=text");
    });
});

describe("serializeBody", () => {
    test("application/json", () => {
        const json = serializeBody({ id: 123 }, "application/json");
        expect(json).toBe("{\"id\":123}");
    });

    test("multipart/form-data", () => {
        const formData = serializeBody({ id: 123, image: new Blob() }, "multipart/form-data");
        expect(formData).toBeInstanceOf(FormData);
        expect((formData as FormData).get("id")).toBe("123");
        expect((formData as FormData).get("image")).toBeInstanceOf(Blob);
    });

    test("undefined", () => {
        expect(serializeBody(undefined, undefined)).toBe(undefined);
        expect(serializeBody(undefined, "application/json")).toBe(undefined);
        expect(serializeBody(undefined, "multipart/form-data")).toBe(undefined);
    });
});


describe("buildHeader", () => {
    test("Header as object", () => {
        const headers = mergeHeaders({ "Content-Type": "application/json" }, { "Authorization": "Bearer 123" }, { "Foo": "Bar" });
        expect(headers.get("Content-Type")).toBe("application/json");
        expect(headers.get("Authorization")).toBe("Bearer 123");
        expect(headers.get("Foo")).toBe("Bar");
    });

    test("Header as Headers class", () => {
        const headers = mergeHeaders({ "Content-Type": "application/json" }, { "Authorization": "Bearer 123" }, new Headers({ Foo: "Bar" }));
        expect(headers.get("Content-Type")).toBe("application/json");
        expect(headers.get("Authorization")).toBe("Bearer 123");
        expect(headers.get("Foo")).toBe("Bar");
    });

    test("Header as key-value pair", () => {
        const headers = mergeHeaders({ "Content-Type": "application/json" }, { "Authorization": "Bearer 123" }, [["Foo", "Bar"]]);
        expect(headers.get("Content-Type")).toBe("application/json");
        expect(headers.get("Authorization")).toBe("Bearer 123");
        expect(headers.get("Foo")).toBe("Bar");
    });
});

