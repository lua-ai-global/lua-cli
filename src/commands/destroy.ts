import inquirer from "inquirer";
import { loadApiKey, deleteApiKey } from "../services/auth.js";

export async function destroyCommand(): Promise<void> {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    console.log("ℹ️  No API key found to delete.");
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "Are you sure you want to delete your API key? This action cannot be undone.",
      default: false
    }
  ]);

  if (confirm) {
    const deleted = await deleteApiKey();
    if (deleted) {
      console.log("✅ API key deleted successfully.");
    } else {
      console.log("❌ Failed to delete API key.");
    }
  } else {
    console.log("ℹ️  API key deletion cancelled.");
  }
}
