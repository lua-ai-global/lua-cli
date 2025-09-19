#!/usr/bin/env node
import { Command } from "commander";
import { 
  configureCommand, 
  initCommand, 
  destroyCommand, 
  apiKeyCommand, 
  agentsCommand,
  deployCommand,
  testCommand 
} from "./commands/index.js";

const program = new Command();

program
  .command("init")
  .description("Initialize a new Lua skill project")
  .action(initCommand);

program
  .command("destroy")
  .description("Delete your stored API key")
  .action(destroyCommand);

program
  .command("configure")
  .description("Set up your API key")
  .action(configureCommand);

program
  .command("apiKey")
  .description("Display your stored API key")
  .action(apiKeyCommand);

program
  .command("agents")
  .description("Fetch agents from HeyLua API")
  .action(agentsCommand);

program
  .command("compile")
  .description("Compile Lua skill to generate deployable format")
  .action(deployCommand);

program
  .command("test")
  .description("Test Lua skill tools interactively")
  .action(testCommand);

program.parse(process.argv);
