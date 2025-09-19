import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import { deployCommand } from "./deploy.js";

export async function testCommand() {
  try {
    console.log("🧪 Testing Lua skill...");
    
    // First, compile the code
    console.log("📦 Compiling code first...");
    await deployCommand();
    
    // Check if .lua directory exists
    const luaDir = path.join(process.cwd(), ".lua");
    if (!fs.existsSync(luaDir)) {
      throw new Error(".lua directory not found. Run 'lua compile' first.");
    }
    
    // Read deploy.json
    const deployJsonPath = path.join(luaDir, "deploy.json");
    if (!fs.existsSync(deployJsonPath)) {
      throw new Error("deploy.json not found. Run 'lua compile' first.");
    }
    
    const deployData = JSON.parse(fs.readFileSync(deployJsonPath, "utf8"));
    
    if (!deployData.tools || deployData.tools.length === 0) {
      throw new Error("No tools found in deploy.json");
    }
    
    // Let user select a tool using picker
    const toolChoices = deployData.tools.map((tool: any) => ({
      name: `${tool.name} - ${tool.description}`,
      value: tool
    }));
    
    const { selectedTool } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedTool',
        message: '🔧 Select a tool to test:',
        choices: toolChoices,
        pageSize: 10
      }
    ]);
    
    console.log(`\n✅ Selected tool: ${selectedTool.name}`);
    
    // Get input values for each required parameter using inquirer
    const inputValues: any = {};
    const inputSchema = selectedTool.inputSchema;
    
    if (inputSchema.properties) {
      console.log("\n📝 Enter input values:");
      
      const inputPrompts = [];
      for (const [key, value] of Object.entries(inputSchema.properties)) {
        const property = value as any;
        const isRequired = inputSchema.required?.includes(key) || false;
        
        let promptType = 'input';
        let validate = undefined;
        
        // Set up validation and input type based on schema
        switch (property.type) {
          case "string":
            if (isRequired) {
              validate = (input: string) => input.trim() !== "" || `${key} is required`;
            }
            break;
          case "number":
            promptType = 'number';
            if (isRequired) {
              validate = (input: number) => !isNaN(input) || `${key} must be a valid number`;
            }
            break;
          case "boolean":
            promptType = 'confirm';
            break;
          default:
            if (isRequired) {
              validate = (input: string) => input.trim() !== "" || `${key} is required`;
            }
        }
        
        inputPrompts.push({
          type: promptType as any,
          name: key,
          message: `${key}${isRequired ? " (required)" : " (optional)"}:`,
          validate: validate as any,
          when: isRequired ? true : (answers: any) => {
            // For optional fields, ask if user wants to provide a value
            return true;
          }
        } as any);
      }
      
      const answers = await inquirer.prompt(inputPrompts);
      
      // Convert answers to proper types
      for (const [key, value] of Object.entries(answers)) {
        const property = inputSchema.properties[key] as any;
        
        switch (property.type) {
          case "string":
            inputValues[key] = value;
            break;
          case "number":
            inputValues[key] = parseFloat(value as string);
            break;
          case "boolean":
            inputValues[key] = value;
            break;
          default:
            inputValues[key] = value;
        }
      }
    }
    
    console.log("\n🚀 Executing tool...");
    console.log(`Input: ${JSON.stringify(inputValues, null, 2)}`);
    
    // Get the execute function string directly from the selected tool
    const toolCode = selectedTool.execute;
    
    // Execute the tool
    try {
      // Create a temporary CommonJS file to run the tool
      const tempFile = path.join(luaDir, `temp-${selectedTool.name}.cjs`);
      const commonJsWrapper = `
const executeFunction = ${toolCode};

// Export the function for testing
module.exports = async (input) => {
  return await executeFunction(input);
};
`;
      
      fs.writeFileSync(tempFile, commonJsWrapper);
      
      // Import and execute the CommonJS module
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const executeFunction = require(tempFile);
      
      const result = await executeFunction(inputValues);
      
      // Clean up temp file
      fs.unlinkSync(tempFile);
      
      console.log("\n✅ Tool execution successful!");
      console.log(`Output: ${JSON.stringify(result, null, 2)}`);
      
    } catch (executionError: any) {
      console.error("\n❌ Tool execution failed:");
      console.error(executionError.message);
      if (executionError.stack) {
        console.error(executionError.stack);
      }
    }
    
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}
