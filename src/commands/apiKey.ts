import inquirer from "inquirer";
import { loadApiKey } from "../services/auth.js";

export async function apiKeyCommand(): Promise<void> {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    console.log("ℹ️  No API key found. Run `lua configure` first.");
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "This will display your API key. Are you sure you want to continue?",
      default: false
    }
  ]);

  if (confirm) {
    console.log("🔑 Your API key:");
    console.log(apiKey);
  } else {
    console.log("ℹ️  API key display cancelled.");
  }
}
