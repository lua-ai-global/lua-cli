import fetch from "node-fetch";
import { loadApiKey } from "../services/auth.js";

export async function agentsCommand(): Promise<void> {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    console.error("❌ No API key found. Run `lua configure` first.");
    process.exit(1);
  }

  const response = await fetch("https://api.heylua.ai/admin", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    console.error(`❌ Error ${response.status}: ${await response.text()}`);
    process.exit(1);
  }

  const data = await response.json();
  console.log("✅ Agents:", JSON.stringify(data, null, 2));
}
