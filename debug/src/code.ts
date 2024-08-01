import { getGoodVibesPoint, WorkleapClient } from "./codegen/v1/wl-client.ts";

const client = new WorkleapClient();

const { data, error, response } = await getGoodVibesPoint(client, { path: { userId: "123" }, parseAs: "blob" });

if (data) {
    response;
}