#!/usr/bin/env node
import { Command } from "commander";
import { 
  configureCommand, 
  initCommand, 
  destroyCommand, 
  apiKeyCommand, 
  agentsCommand 
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

program.parse(process.argv);
