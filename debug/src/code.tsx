import { useQueryClient } from "@tanstack/react-query";
import { listAssistantsQueryKey, useCreateAssistantMutation, useListAssistantsSuspenseQuery } from "./codegen/v1/queries.tsx";

export function App() {
    const queryClient = useQueryClient();
    const { data: assistantsResponse } = useListAssistantsSuspenseQuery();
    const { mutate } = useCreateAssistantMutation();

    function handleClick() {
        mutate({
            body: { model: "gpt-3.5-turbo" },
            request: { signal: AbortSignal.timeout(500) }
        }, {
            onSuccess: assistant => {
                queryClient.invalidateQueries({ queryKey: listAssistantsQueryKey() });

                console.log(`Assistant ${assistant.name} created!`);
            }
        });
    }

    return (
        <div>
            <button onClick={handleClick}>Create Assistant</button>

            {assistantsResponse.data.map(assistant => (
                <div key={assistant.id}>
                    <h1>{assistant.name}</h1>
                    <p>{assistant.description}</p>
                </div>
            ))}
        </div> 
    );
}
