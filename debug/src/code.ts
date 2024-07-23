import { getGoodVibesPoint, WorkleapClient } from "./codegen/v1/wl-client.ts";

const client = new WorkleapClient();

const { data, error } = await getGoodVibesPoint(client, { path: { userId: "123" } });

if (error) {
    console.error(error);
} else {
    data;
}
