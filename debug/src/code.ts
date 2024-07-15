import { createClient } from "./codegen/v1/client.ts";

const client = createClient({ baseUrl: "https://api.example.com" });

const { data, error } = await client.GET("/good-vibes-points/{userId}", { params: { path: { userId: "123" } } });

if (error) {
    console.error(error.title);
    console.error(error.detail);
}

if (data?.point) {
    console.log(`You have ${data.point} good vibes points!`);
}
