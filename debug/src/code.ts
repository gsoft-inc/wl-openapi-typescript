import { OpenAIAPIClient, type Result } from "./codegen/v1/wl-client.ts";
import { useQuery } from "@tanstack/react-query";

const [response] = await client.getAssistant({ path: { assistant_id: "123" } });

if (response) {
    const assistant = await response.json(); // <-- Parse the body into an object
    console.log("Hello, " + assistant.name);
}

const client = new OpenAIAPIClient({
    baseURL: "https://api.openai.com/v1"
});

async function queryfy<T, E>(result: Promise<Result<T, E>>, type: keyof Response = "json"): Promise<T> {
    const [success, error] = await result;
    if (success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (success[type] as any)();
    } else {
        throw error;
    }
}

export function useAssistant(...args: Parameters<typeof client.getAssistant>) {
    return useQuery({
        queryKey: [client.getAssistant, ...args],
        queryFn: () => queryfy(client.getAssistant(...args), "json")
    });
}