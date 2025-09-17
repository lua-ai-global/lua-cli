import inquirer from "inquirer";
import { fileURLToPath } from "url";
import path from "path";
import { loadApiKey, checkApiKey } from "../services/auth.js";
import { copyTemplateFiles, createSkillToml } from "../utils/files.js";
import { Organization, Agent } from "../types/index.js";

export async function initCommand(): Promise<void> {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    console.error("❌ No API key found. Run `lua configure` first.");
    process.exit(1);
  }

  // Get user data from API
  const userData = await checkApiKey(apiKey);
  
  // Extract organizations and create choices for selection
  const orgs = userData.admin.orgs;
  const orgChoices = orgs.map((org: Organization) => ({
    name: org.registeredName,
    value: org
  }));

  // Select organization
  const { selectedOrg } = await inquirer.prompt([
    {
      type: "list",
      name: "selectedOrg",
      message: "Select an organization:",
      choices: orgChoices
    }
  ]);

  // Extract agents from selected organization
  const agentChoices = selectedOrg.agents.map((agent: Agent) => ({
    name: agent.name,
    value: agent
  }));

  // Select agent
  const { selectedAgent } = await inquirer.prompt([
    {
      type: "list",
      name: "selectedAgent",
      message: "Select an agent:",
      choices: agentChoices
    }
  ]);

  // Get skill details
  const { skillName, skillDescription } = await inquirer.prompt([
    {
      type: "input",
      name: "skillName",
      message: "Enter a name for your skill:",
      default: "My Lua Skill"
    },
    {
      type: "input",
      name: "skillDescription",
      message: "Describe your skill:",
      default: "A Lua skill for automation"
    }
  ]);

  // Create lua.skill.toml file
  createSkillToml(selectedAgent.agentId, selectedOrg.id, skillName, skillDescription);
  console.log("✅ Created lua.skill.toml");

  // Copy template files
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const templateDir = path.join(__dirname, "..", "..", "template");
  const currentDir = process.cwd();
  
  copyTemplateFiles(templateDir, currentDir);
  console.log("✅ Copied template files");

  console.log("🎉 Lua skill project initialized successfully!");
}
