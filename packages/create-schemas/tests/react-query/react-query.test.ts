import { assert, describe, test } from "vitest";
import { reactQueryPlugin, type EmittedFile } from "../../src/plugins/index.ts";
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

describe.concurrent("react-query-plugin", () => {
    test("generates simple TODO client", async ({ expect }) => {
        const plugin = reactQueryPlugin();

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
          "import { createContext, useContext } from "react";
          import { useQuery, useSuspenseQuery, useMutation, type UseQueryResult, type UseQueryOptions, type UseSuspenseQueryResult, type UseMutationResult, type UseMutationOptions, type QueryKey, type QueryClient, type FetchQueryOptions, type UseSuspenseQueryOptions } from "@tanstack/react-query";
          import { OpenAPIClient, internal_fetch } from "@workleap/create-schemas/plugins/react-query-plugin/openapi-client";

          export { OpenAPIClient };

          const TodoAPIClient = createContext(new OpenAPIClient());

          export function TodoAPIClientProvider({ children, client }: {
              children: React.ReactNode;
              client: OpenAPIClient;
          }) {
              return <TodoAPIClient.Provider value={client}>{children}</TodoAPIClient.Provider>;
          }

          export interface GetTodosInit {
              request?: RequestInit;
          }

          function getTodos(client: OpenAPIClient, init: GetTodosInit = {}): Promise<Todo[]> {
              return client[internal_fetch]("GET", "/todo", init);
          }

          export function getTodosQueryKey(init: GetTodosInit = {}): QueryKey {
              return ["get", "/todo", init];
          }

          export interface PrefetchGetTodosOptions extends GetTodosInit {
              queryOptions?: Partial<FetchQueryOptions<Todo[], unknown>>;
          }

          export function prefetchGetTodos(client: OpenAPIClient, queryClient: QueryClient, options: PrefetchGetTodosOptions = {}): Promise<void> {
              const { queryOptions, ...init } = options;
              return queryClient.prefetchQuery({
                  queryKey: getTodosQueryKey(init),
                  queryFn: () => getTodos(client, init),
                  ...queryOptions
              });
          }

          export interface UseGetTodosQueryOptions extends GetTodosInit {
              queryOptions?: Partial<UseQueryOptions<Todo[], unknown>>;
          }

          /**
           * \`GET /todo\`
           */
          export function useGetTodosQuery(options: UseGetTodosQueryOptions = {}): UseQueryResult<Todo[], unknown> {
              const { queryOptions, ...init } = options;
              const client = useContext(TodoAPIClient);
              return useQuery({
                  queryKey: getTodosQueryKey(init),
                  queryFn: () => getTodos(client, init),
                  ...queryOptions
              });
          }

          export interface UseGetTodosSuspenseQueryOptions extends GetTodosInit {
              queryOptions?: Partial<UseSuspenseQueryOptions<Todo[], unknown>>;
          }

          /**
           * \`GET /todo\`
           */
          export function useGetTodosSuspenseQuery(options: UseGetTodosSuspenseQueryOptions = {}): UseSuspenseQueryResult<Todo[], unknown> {
              const { queryOptions, ...init } = options;
              const client = useContext(TodoAPIClient);
              return useSuspenseQuery({
                  queryKey: getTodosQueryKey(init),
                  queryFn: () => getTodos(client, init),
                  ...queryOptions
              });
          }

          export interface CreateTodoInit {
              body?: Todo;
              request?: RequestInit;
          }

          function createTodo(client: OpenAPIClient, init: CreateTodoInit = {}): Promise<unknown> {
              return client[internal_fetch]("POST", "/todo", init, "application/json");
          }

          export function createTodoQueryKey(init: CreateTodoInit = {}): QueryKey {
              return ["post", "/todo", init];
          }

          export interface PrefetchCreateTodoOptions extends CreateTodoInit {
              queryOptions?: Partial<FetchQueryOptions<unknown, unknown>>;
          }

          export function prefetchCreateTodo(client: OpenAPIClient, queryClient: QueryClient, options: PrefetchCreateTodoOptions = {}): Promise<void> {
              const { queryOptions, ...init } = options;
              return queryClient.prefetchQuery({
                  queryKey: createTodoQueryKey(init),
                  queryFn: () => createTodo(client, init),
                  ...queryOptions
              });
          }

          export interface UseCreateTodoQueryOptions extends CreateTodoInit {
              queryOptions?: Partial<UseQueryOptions<unknown, unknown>>;
          }

          /**
           * \`POST /todo\`
           *
           * Create a new todo
           */
          export function useCreateTodoQuery(options: UseCreateTodoQueryOptions = {}): UseQueryResult<unknown, unknown> {
              const { queryOptions, ...init } = options;
              const client = useContext(TodoAPIClient);
              return useQuery({
                  queryKey: createTodoQueryKey(init),
                  queryFn: () => createTodo(client, init),
                  ...queryOptions
              });
          }

          export interface UseCreateTodoSuspenseQueryOptions extends CreateTodoInit {
              queryOptions?: Partial<UseSuspenseQueryOptions<unknown, unknown>>;
          }

          /**
           * \`POST /todo\`
           *
           * Create a new todo
           */
          export function useCreateTodoSuspenseQuery(options: UseCreateTodoSuspenseQueryOptions = {}): UseSuspenseQueryResult<unknown, unknown> {
              const { queryOptions, ...init } = options;
              const client = useContext(TodoAPIClient);
              return useSuspenseQuery({
                  queryKey: createTodoQueryKey(init),
                  queryFn: () => createTodo(client, init),
                  ...queryOptions
              });
          }

          /**
           * \`POST /todo\`
           *
           * Create a new todo
           */
          export function useCreateTodoMutation(options: Partial<UseMutationOptions<unknown, unknown, CreateTodoInit>> = {}): UseMutationResult<unknown, unknown, CreateTodoInit> {
              const client = useContext(TodoAPIClient);
              return useMutation({
                  mutationFn: (init: CreateTodoInit = {}) => createTodo(client, init),
                  ...options
              });
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

          function getTodoById(client: OpenAPIClient, init: GetTodoByIdInit = {}): Promise<Todo> {
              return client[internal_fetch]("GET", "/todo/{id}", init);
          }

          export function getTodoByIdQueryKey(init: GetTodoByIdInit = {}): QueryKey {
              return ["get", "/todo/{id}", init];
          }

          export interface PrefetchGetTodoByIdOptions extends GetTodoByIdInit {
              queryOptions?: Partial<FetchQueryOptions<Todo, unknown>>;
          }

          export function prefetchGetTodoById(client: OpenAPIClient, queryClient: QueryClient, options: PrefetchGetTodoByIdOptions = {}): Promise<void> {
              const { queryOptions, ...init } = options;
              return queryClient.prefetchQuery({
                  queryKey: getTodoByIdQueryKey(init),
                  queryFn: () => getTodoById(client, init),
                  ...queryOptions
              });
          }

          export interface UseGetTodoByIdQueryOptions extends GetTodoByIdInit {
              queryOptions?: Partial<UseQueryOptions<Todo, unknown>>;
          }

          /**
           * \`GET /todo/{id}\`
           *
           * Get a todo by ID
           */
          export function useGetTodoByIdQuery(options: UseGetTodoByIdQueryOptions = {}): UseQueryResult<Todo, unknown> {
              const { queryOptions, ...init } = options;
              const client = useContext(TodoAPIClient);
              return useQuery({
                  queryKey: getTodoByIdQueryKey(init),
                  queryFn: () => getTodoById(client, init),
                  ...queryOptions
              });
          }

          export interface UseGetTodoByIdSuspenseQueryOptions extends GetTodoByIdInit {
              queryOptions?: Partial<UseSuspenseQueryOptions<Todo, unknown>>;
          }

          /**
           * \`GET /todo/{id}\`
           *
           * Get a todo by ID
           */
          export function useGetTodoByIdSuspenseQuery(options: UseGetTodoByIdSuspenseQueryOptions = {}): UseSuspenseQueryResult<Todo, unknown> {
              const { queryOptions, ...init } = options;
              const client = useContext(TodoAPIClient);
              return useSuspenseQuery({
                  queryKey: getTodoByIdQueryKey(init),
                  queryFn: () => getTodoById(client, init),
                  ...queryOptions
              });
          }

          export type Todo = {
              id?: string;
              text?: string;
          };

          "
        `);
    });
});
