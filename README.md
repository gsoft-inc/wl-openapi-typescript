# wl-openapi-typescript

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![CI](https://github.com/gsoft-inc/wl-openapi-typescript/actions/workflows/ci.yml/badge.svg)](https://github.com/gsoft-inc/wl-openapi-typescript/actions/workflows/ci.yml)

Tools to generate TypeScript schemas from OpenAPI. It leverage [openapi-typescript](https://github.com/drwpow/openapi-typescript) and re-export types in a more user friendly way.

## Packages

| Package                 | Version                                                                                                                                     |
|-------------------------| ---------------------------------------------------------------------------------------------------------------------------------------------|
| [@workleap/create-schemas](https://www.npmjs.org/package/@workleap/create-schemas)| [![NPM Version](http://img.shields.io/npm/v/@workleap/create-schemas.svg?style=flat)](https://www.npmjs.org/package/@workleap/create-schemas) |


## Usages

Add a script in package.json to call `@workleap/create-schemas`

```json
  "scripts": {
    "create-schemas": "pnpm create-schemas path_or_public_url_to_openapi_document -o output_path"
  },
  "devDependencies": {
    "@workleap/create-schemas": "0.0.1"
  }
```

It is also fowarding all the [flags of openapi-typescript](https://openapi-ts.pages.dev/cli#flags) for more customization.

(TODO: Not supporting type and immutable flags)
(also test with path-params-as-type)

### Example

By example from this OpenAPI document:

```yaml
openapi: 3.0.1
info:
  title: WebApi
  version: '1.0'
paths:
  /good-vibes-points:
    get:
      tags:
        - GoodVibesBank
      summary: Get the current number of good vibe for a user
      operationId: GetGoodVibesPoint
      parameters:
        - name: userId
          in: query
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GetGoodVibePointsResult'
        '400':
          description: Bad Request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProblemDetails'
components:
  schemas:
    GetGoodVibePointsResult:
      required:
        - point
      type: object
      properties:
        point:
          type: integer
          format: int32
      additionalProperties: false
    ProblemDetails:
      type: object
      properties:
        type:
          type: string
          nullable: true
        title:
          type: string
          nullable: true
        status:
          type: integer
          format: int32
          nullable: true
        detail:
          type: string
          nullable: true
        instance:
          type: string
          nullable: true
      additionalProperties: { }
```

It will generate this schame file:

```ts
// From openapi-typescript
export interface paths {
    "/good-vibes-points": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get the current number of good vibe for a user */
        get: operations["GetGoodVibesPoint"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        GetGoodVibePointsResult: {
            /** Format: int32 */
            point: number;
        };
        ProblemDetails: {
            type?: string | null;
            title?: string | null;
            /** Format: int32 */
            status?: number | null;
            detail?: string | null;
            instance?: string | null;
            [key: string]: unknown;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    GetGoodVibesPoint: {
        parameters: {
            query: {
                userId: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetGoodVibePointsResult"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
}

// From wl-openapi-typescript
export type GetGoodVibePointsResult = components["schemas"]["GetGoodVibePointsResult"];
export type ProblemDetails = components["schemas"]["ProblemDetails"];

export type Endpoints = keyof paths;
```

For more details on how to use see [openapi-typescript documentation](https://openapi-ts.pages.dev/introduction)


## 🤝 Contributing

View the [contributor's documentation](./CONTRIBUTING.md).
