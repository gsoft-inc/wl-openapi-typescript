import type { OpenAPIV3_1, OpenAPIV3, OpenAPIV2, IJsonSchema } from "openapi-types";

export type OpenAPIDocument = OpenAPIV3_1.Document | OpenAPIV3.Document | OpenAPIV2.Document;
export type SchemaObject = OpenAPIV3_1.SchemaObject | OpenAPIV3.SchemaObject | OpenAPIV2.SchemaObject | IJsonSchema;
export type ReferenceObject = OpenAPIV3_1.ReferenceObject | OpenAPIV3.ReferenceObject | OpenAPIV2.ReferenceObject;
export type PathItemObject = OpenAPIV3_1.PathItemObject | OpenAPIV3.PathItemObject | OpenAPIV2.PathItemObject;
export type OperationObject = OpenAPIV3_1.OperationObject | OpenAPIV3.OperationObject | OpenAPIV2.OperationObject;