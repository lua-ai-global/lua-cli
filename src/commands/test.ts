import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import { deployCommand } from "./deploy.js";
import { gunzipSync } from "zlib";
import { Buffer } from "buffer";
import { createRequire } from "module";
import vm from "vm";

// Decompression utility
function decompressCode(compressedCode: string): string {
  const buffer = Buffer.from(compressedCode, 'base64');
  return gunzipSync(buffer).toString('utf8');
}

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
    
    // Get the execute function string directly from the selected tool and decompress it
    const toolCode = decompressCode(selectedTool.execute);
    
    // Execute the tool
    try {
      // Create a CommonJS context for execution
      const require = createRequire(process.cwd() + '/package.json');
      
      // Create a sandbox context with require and other necessary globals
      const sandbox = {
        require,
        console,
        Buffer,
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        process,
        global: globalThis,
        __dirname: process.cwd(),
        __filename: path.join(process.cwd(), 'index.ts'),
        module: { exports: {} },
        exports: {},
        // Web APIs
        fetch: globalThis.fetch,
        URLSearchParams: globalThis.URLSearchParams,
        URL: globalThis.URL,
        Headers: globalThis.Headers,
        Request: globalThis.Request,
        Response: globalThis.Response,
        // Additional Node.js globals that might be needed
        Object,
        Array,
        String,
        Number,
        Boolean,
        Date,
        Math,
        JSON,
        Error,
        TypeError,
        ReferenceError,
        SyntaxError,
        // Node.js specific globals
        globalThis,
        // Additional globals that might be referenced
        undefined: undefined,
        null: null,
        Infinity: Infinity,
        NaN: NaN
      };
      
      // Create the CommonJS wrapper code
      const commonJsWrapper = `
const executeFunction = ${toolCode};

// Export the function for testing
module.exports = async (input) => {
  return await executeFunction(input);
};
`;
      
      // Execute the code in the sandbox
      const context = vm.createContext(sandbox);
      vm.runInContext(commonJsWrapper, context);
      
      // Get the exported function
      const executeFunction = context.module.exports;
      
      const result = await executeFunction(inputValues);
      
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
