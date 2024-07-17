import { GetGoodVibesPoint, WorkleapClient } from "./codegen/v1/wl-client.ts";

const client = new WorkleapClient();

const { data, error } = await GetGoodVibesPoint(client, { path: { userId: "1" } });

if (error) {
    throw new Error(error.title);
}

console.log(`You have ${data.point} good vibes points!`);
