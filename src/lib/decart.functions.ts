import { createServerFn } from "@tanstack/react-start";

// Mints a short-lived Decart client token so the permanent API key never reaches the browser.
export const createRealtimeToken = createServerFn({ method: "POST" }).handler(async () => {
  const apiKey = process.env["DECART_API_KEY"];
  if (!apiKey) throw new Error("Decart API key is not configured");
  const { createDecartClient } = await import("@decartai/sdk");
  const client = createDecartClient({ apiKey });
  const result = await client.tokens.create({ expiresIn: 300 });
  return { apiKey: result.apiKey };
});
