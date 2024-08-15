import { assert, describe, test } from "vitest";
import { clientPlugin, type EmittedFile } from "../src/plugins/index.ts";
import type { OpenAPIV3_1 } from "openapi-types";

const document: OpenAPIV3_1.Document = {
    openapi: "3.0.0",
    info: {
        title: "Todo API",
        version: "1.0.0"
    },
    paths: {
        "/todo": {
            get: {
                operationId: "getTodos",
                responses: {
                    "200": {
                        description: "A list of todos",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: {
                                        "$ref": "#/components/schemas/Todo"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                operationId: "createTodo",
                description: "Create a new todo",
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                "$ref": "#/components/schemas/Todo"
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Todo created"
                    }
                }
            }
        },
        "/todo/{id}": {
            get: {
                description: "Get a todo by ID",
                operationId: "getTodoById",
                parameters: [{
                    in: "path",
                    name: "id",
                    description: "The ID of the Todo you want to retrieve",
                    schema: {
                        type: "string"
                    }
                }],
                responses: {
                    "200": {
                        description: "A todo",
                        content: {
                            "application/json": {
                                schema: {
                                    "$ref": "#/components/schemas/Todo"
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    components: {
        schemas: {
            "Todo": {
                type: "object",
                properties: {
                    id: {
                        type: "string"
                    },
                    text: {
                        type: "string"
                    }
                }
            }
        }
    }
};

describe.concurrent("client-plugin", () => {
    test("generates simple TODO client", async ({ expect }) => {
        const plugin = clientPlugin();

        assert(plugin.buildStart);

        let file: EmittedFile | undefined;
        function emitFile(emitted: EmittedFile) {
            file = emitted;
        }

        await plugin.buildStart({
            document,
            emitFile,
            config: {
                configFile: "create-schemas.config",
                root: "",
                emit: true,
                outdir: "",
                openApiTsOptions: {},
                plugins: [],
                watch: false,
                input: ""
            }
        });

        expect(file).toBeDefined();

        expect(file?.code).toMatchInlineSnapshot(`
          "import { BaseClient, type BaseClientOptions, type Result } from "@workleap/create-schemas/plugins/base-client";

          export type { BaseClientOptions, Result, Middleware } from "@workleap/create-schemas/plugins/base-client";

          export class TodoAPIClient extends BaseClient {
              constructor(options: BaseClientOptions = {}) {
                  super(options);
              }
              /**
               * \`GET /todo\`
               */
              getTodos(init: GetTodosInit = {}): Promise<Result<Todo[], unknown>> {
                  return this.fetch("GET", "/todo", init);
              }
              /**
               * \`POST /todo\`
               *
               * Create a new todo
               */
              createTodo(init: CreateTodoInit = {}): Promise<Result<unknown, unknown>> {
                  return this.fetch("POST", "/todo", init, "application/json");
              }
              /**
               * \`GET /todo/{id}\`
               *
               * Get a todo by ID
               */
              getTodoById(init: GetTodoByIdInit = {}): Promise<Result<Todo, unknown>> {
                  return this.fetch("GET", "/todo/{id}", init);
              }
          }

          export interface GetTodosInit {
              request?: RequestInit;
          }

          export interface CreateTodoInit {
              body?: Todo;
              request?: RequestInit;
          }

          export interface GetTodoByIdInit {
              path?: {
                  /**
                   * The ID of the Todo you want to retrieve
                   */
                  id?: string;
              };
              request?: RequestInit;
          }

          export type Todo = {
              id?: string;
              text?: string;
          };

          "
        `);
    });
});
