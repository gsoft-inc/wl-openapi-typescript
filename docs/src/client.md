---
icon: rss
label: HTTP Client
order: -5
---

# HTTP Client


The client plugin lets you generate a 100% type-safe client.

## Usage

First, add the `clientPlugin` to your configuration:

```ts #2,5 create-schemas.config.ts 
import { defineConfig } from "@workleap/create-schemas";
import { clientPlugin } from "@workleap/create-schemas/plugins";

export default defineConfig({
    plugins: [clientPlugin()]
    input: "v1.yaml",
    outdir: "codegen",
});
```

Then, you can then import the client from the `./client.ts` file. The client will be named after the `info.title` property:

```ts
import { PetStoreAPIClient } from "./codegen/client.ts";

const client = new PetStoreAPIClient({ baseURL: "https://petstore.io/v3" });

const [success, error] = await client.listPets({ query: { limit: 10 }});

if (success) {
  const pets = await success.json();
  console.log(pets);
}
```

## Response

The client returns a tuple with the shape `[success, error]`.

- If the request is successful (i.e. received a response with a `2xx` status), only `success` will be defined.
- If the request is unsuccessful (i.e. failed to make the request or received a response with a `4xx` or `5xx` status), only `error` will be defined.

A successful response is typed as `TypedResponse<T>`. Calling `await success.json()` will return a value with the type `T` defined in the OpenAPI document.

```ts
const [success, error] = await client.listPets({ query: { limit: 10 }});

if (success) {
  const pets = await success.json();
  console.log(pets);
}
```


An unsuccessful response is typed as `TypedResponse<T> | Error`. It is the responsability of the developer to narrow the type of the error before trying to access its properties.

```ts
const [success, error] = await client.listPets({ query: { limit: 10 }});

if (error) {
  if (error instanceof Error) {
    /* ... */
  }

  if (error instanceof DOMException) {
    /* ... */
  }

  if (error instanceof Response) {
    const data = await error.json();
    /* ... */
  }
}
```

## Middlewares

You can add logic before or after every requests by using a middleware. You can
add a middleware to the client using the `.use(middleware)` method, and you can
remove it using the `.unuse(middleware)` method.

There are three different functions that middlewares can use:

- `onRequest(request)`: Runs before the client makes a request. Lets you modify the request object before it is sent.
- `onResponse(response)`: Runs after the client receives a response. 
  - This function will be called on `4xx` and `5xx`.
- `onError(error)`: Runs when the client is unable to complete a request due to the request being aborted or due to a network error.
  - This function will **not** be called on `4xx` or `5xx`.


### Usage

Here is simple middleware that redirects the user to the `/login` page when the
backend responds with a `401`.

```ts
const client = new PetStoreAPIClient({ baseURL: "https://petstore.io/v3" });

client.use({
  onResponse(response) {
    if (response.status === 401) {
      window.location.replace("/login");
      return new Promise();
    }
  }
});
```

### Usage within React

You might want to add or remove a middleware that depends on a value accessible from within React. You can do this using the `useEffect` hook from React:

```ts
const client = new PetStoreAPIClient({ baseURL: "https://petstore.io/v3" });

function MyComponent() {
  const toast = useToast();

  useEffect(() => {
    const middleware = {
      onResponse(response) {
        if (response.status >= 400) {
          const details = response.clone().json();
          toast.error(details.message);
        }
      },
      onError(error) {
        toast.error(error.message);
      }
    };

    client.use(middleware);

    return () => client.unuse(middleware);
  }, [toast]);

  /* ... */
}

```

## API

```ts
type TypedResponse<T> = Omit<Response, "json"> & {
    json: () => Promise<T>;
};

type Result<D, E> = Ok<D> | Err<E>;

type Ok<T> = [TypedResponse<T>, undefined];

type Err<T> = [undefined, TypedResponse<T> | Error];

interface BaseClientOptions {
  baseURL?: string;
  headers?: HeadersInit;
  query?: SerializeQueryOptions;
}

interface Middleware {
  onRequest?: (request: Request) => undefined | Request | Promise<undefined | Request>;
  onResponse?: (response: Response) => undefined | Response | Promise<undefined | Response>;
  onError?: (error: unknown) => void;
}

declare class BaseClient {
  constructor(options?: BaseClientOptions);
  use(...middlewares: Middleware[]): void;
  unuse(...middlewares: Middleware[]): void;
}
```

