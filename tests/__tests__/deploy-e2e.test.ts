import { LuaSkill } from '../../src/types/index';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

describe('Deploy Command - End-to-End Tests', () => {
  const testDir = path.join(__dirname, '..', '..', 'test-deploy-project');
  
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create a real Lua skill project
    const indexTsContent = `import z from "zod";
import { LuaSkill } from "lua-cli/types";

class WeatherService {
  constructor() {
    this.apiKey = "test-api-key";
  }

  async getWeather(city: string) {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 10));
    return { 
      weather: "sunny", 
      city: city,
      temperature: 25,
      humidity: 60
    };
  }
}

class MathService {
  constructor() {
    this.cache = new Map();
  }

  async calculate(a: number, b: number, operation: string) {
    const key = \`\${a}-\${b}-\${operation}\`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    let result: number;
    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) throw new Error('Division by zero');
        result = a / b;
        break;
      default:
        throw new Error('Invalid operation');
    }
    
    this.cache.set(key, { result });
    return { result };
  }
}

const weatherService = new WeatherService();
const mathService = new MathService();

const skill = new LuaSkill("test-api-key");

// Weather tool
const weatherInputSchema = z.object({
  city: z.string().min(1, "City name is required"),
});
const weatherOutputSchema = z.object({
  weather: z.string(),
  city: z.string(),
  temperature: z.number(),
  humidity: z.number(),
});

skill.addTool({
  name: "get_weather",
  description: "Get weather information for a city",
  inputSchema: weatherInputSchema,
  outputSchema: weatherOutputSchema,
  execute: async (input: z.infer<typeof weatherInputSchema>) => {
    return weatherService.getWeather(input.city);
  },
});

// Math tool
const mathInputSchema = z.object({
  a: z.number(),
  b: z.number(),
  operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
});
const mathOutputSchema = z.object({
  result: z.number(),
});

skill.addTool({
  name: "calculate",
  description: "Perform mathematical calculations",
  inputSchema: mathInputSchema,
  outputSchema: mathOutputSchema,
  execute: async (input: z.infer<typeof mathInputSchema>) => {
    return mathService.calculate(input.a, input.b, input.operation);
  },
});

// Test the skill locally
async function main() {
  try {
    console.log("Testing weather tool:");
    const weatherResult = await skill.run({
      tool: "get_weather",
      city: "London"
    });
    console.log("Weather result:", weatherResult);
    
    console.log("\\nTesting math tool:");
    const mathResult = await skill.run({
      tool: "calculate",
      a: 10,
      b: 5,
      operation: "add"
    });
    console.log("Math result:", mathResult);
    
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

main().catch(console.error);
`;

    const packageJsonContent = {
      name: "test-lua-skill",
      version: "2.0.0",
      description: "Test Lua skill for end-to-end deploy testing",
      type: "module",
      main: "index.ts",
      scripts: {
        start: "tsx index.ts",
        deploy: "lua deploy"
      },
      dependencies: {
        "lua-cli": "file:../..",
        "zod": "^4.1.9"
      },
      devDependencies: {
        "tsx": "^4.7.0",
        "typescript": "^5.3.0",
        "@types/node": "^20.10.0"
      }
    };

    // Write files
    fs.writeFileSync(path.join(testDir, 'index.ts'), indexTsContent);
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJsonContent, null, 2));
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should deploy and execute weather tool end-to-end', async () => {
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testDir);

    try {
      // Debug: Check if files exist
      console.log('Files in test dir:', fs.readdirSync(testDir));
      console.log('index.ts exists:', fs.existsSync(path.join(testDir, 'index.ts')));
      console.log('package.json exists:', fs.existsSync(path.join(testDir, 'package.json')));

      // Import and run the deploy command
      const { deployCommand } = await import('../../src/commands/deploy');
      
      // Capture console output
      const originalLog = console.log;
      const originalError = console.error;
      let deployOutput = '';
      
      console.log = (message: any) => {
        deployOutput += message + '\n';
      };
      console.error = (message: any) => {
        deployOutput += message + '\n';
      };

      // Run deploy command
      await deployCommand();

      // Restore console
      console.log = originalLog;
      console.error = originalError;

      // Debug: Log the deploy output
      console.log('Deploy output:', deployOutput);

      // Extract JSON from deploy output
      const jsonStart = deployOutput.indexOf('{');
      const jsonEnd = deployOutput.lastIndexOf('}') + 1;
      const jsonString = deployOutput.substring(jsonStart, jsonEnd);
      const deployData = JSON.parse(jsonString);

      // Verify deploy output structure
      expect(deployData.version).toBe('2.0.0');
      expect(deployData.skillsName).toBe('test-lua-skill');
      expect(deployData.tools).toHaveLength(2);

      // Find weather tool
      const weatherTool = deployData.tools.find((tool: any) => tool.name === 'get_weather');
      expect(weatherTool).toBeDefined();
      expect(weatherTool.description).toBe('Get weather information for a city');

      // Verify weather tool schema
      expect(weatherTool.inputSchema).toEqual({
        type: 'object',
        properties: {
          city: {
            type: 'string',
            minLength: 1
          }
        },
        required: ['city']
      });

      expect(weatherTool.outputSchema).toEqual({
        type: 'object',
        properties: {
          weather: { type: 'string' },
          city: { type: 'string' },
          temperature: { type: 'number' },
          humidity: { type: 'number' }
        },
        required: ['weather', 'city', 'temperature', 'humidity']
      });

      // Test the deployable execute function
      const executeFunction = eval(`(${weatherTool.execute})`);
      
      // Test with valid input
      const result = await executeFunction({ city: 'Paris' });
      
      expect(result).toEqual({
        weather: 'sunny',
        city: 'Paris',
        temperature: 25,
        humidity: 60
      });

      // Test with invalid input (should throw)
      await expect(executeFunction({ city: '' })).rejects.toThrow();

    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
  });

  it('should deploy and execute math tool end-to-end', async () => {
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testDir);

    try {
      // Import and run the deploy command
      const { deployCommand } = await import('../../src/commands/deploy');
      
      // Capture console output
      const originalLog = console.log;
      let deployOutput = '';
      
      console.log = (message: any) => {
        deployOutput += message + '\n';
      };

      // Run deploy command
      await deployCommand();

      // Restore console
      console.log = originalLog;

      // Extract JSON from deploy output
      const jsonStart = deployOutput.indexOf('{');
      const jsonEnd = deployOutput.lastIndexOf('}') + 1;
      const jsonString = deployOutput.substring(jsonStart, jsonEnd);
      const deployData = JSON.parse(jsonString);

      // Find math tool
      const mathTool = deployData.tools.find((tool: any) => tool.name === 'calculate');
      expect(mathTool).toBeDefined();

      // Verify math tool schema
      expect(mathTool.inputSchema).toEqual({
        type: 'object',
        properties: {
          a: { type: 'number' },
          b: { type: 'number' },
          operation: {
            type: 'string',
            enum: ['add', 'subtract', 'multiply', 'divide']
          }
        },
        required: ['a', 'b', 'operation']
      });

      // Test the deployable execute function
      const executeFunction = eval(`(${mathTool.execute})`);
      
      // Test addition
      const addResult = await executeFunction({ a: 10, b: 5, operation: 'add' });
      expect(addResult).toEqual({ result: 15 });

      // Test subtraction
      const subResult = await executeFunction({ a: 10, b: 3, operation: 'subtract' });
      expect(subResult).toEqual({ result: 7 });

      // Test multiplication
      const mulResult = await executeFunction({ a: 4, b: 6, operation: 'multiply' });
      expect(mulResult).toEqual({ result: 24 });

      // Test division
      const divResult = await executeFunction({ a: 20, b: 4, operation: 'divide' });
      expect(divResult).toEqual({ result: 5 });

      // Test division by zero (should throw)
      await expect(executeFunction({ a: 10, b: 0, operation: 'divide' })).rejects.toThrow('Division by zero');

      // Test invalid operation (should throw)
      await expect(executeFunction({ a: 10, b: 5, operation: 'invalid' })).rejects.toThrow('Invalid operation');

    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
  });

  it('should handle complex dependencies and caching', async () => {
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testDir);

    try {
      // Import and run the deploy command
      const { deployCommand } = await import('../../src/commands/deploy');
      
      // Capture console output
      const originalLog = console.log;
      let deployOutput = '';
      
      console.log = (message: any) => {
        deployOutput += message + '\n';
      };

      // Run deploy command
      await deployCommand();

      // Restore console
      console.log = originalLog;

      // Extract JSON from deploy output
      const jsonStart = deployOutput.indexOf('{');
      const jsonEnd = deployOutput.lastIndexOf('}') + 1;
      const jsonString = deployOutput.substring(jsonStart, jsonEnd);
      const deployData = JSON.parse(jsonString);

      // Find math tool (which has caching)
      const mathTool = deployData.tools.find((tool: any) => tool.name === 'calculate');
      const executeFunction = eval(`(${mathTool.execute})`);
      
      // Test caching behavior - same calculation should return cached result
      const result1 = await executeFunction({ a: 5, b: 3, operation: 'add' });
      const result2 = await executeFunction({ a: 5, b: 3, operation: 'add' });
      
      expect(result1).toEqual({ result: 8 });
      expect(result2).toEqual({ result: 8 });
      
      // Verify the execute function includes the MathService class
      expect(mathTool.execute).toContain('class MathService');
      expect(mathTool.execute).toContain('this.cache = new Map()');

    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
  });

  it('should verify self-contained execute functions work independently', async () => {
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testDir);

    try {
      // Import and run the deploy command
      const { deployCommand } = await import('../../src/commands/deploy');
      
      // Capture console output
      const originalLog = console.log;
      let deployOutput = '';
      
      console.log = (message: any) => {
        deployOutput += message + '\n';
      };

      // Run deploy command
      await deployCommand();

      // Restore console
      console.log = originalLog;

      // Extract JSON from deploy output
      const jsonStart = deployOutput.indexOf('{');
      const jsonEnd = deployOutput.lastIndexOf('}') + 1;
      const jsonString = deployOutput.substring(jsonStart, jsonEnd);
      const deployData = JSON.parse(jsonString);

      // Test both tools in isolation (simulating remote execution)
      const weatherTool = deployData.tools.find((tool: any) => tool.name === 'get_weather');
      const mathTool = deployData.tools.find((tool: any) => tool.name === 'calculate');

      // Create isolated execution environment
      const isolatedWeatherFunction = eval(`(${weatherTool.execute})`);
      const isolatedMathFunction = eval(`(${mathTool.execute})`);

      // Test weather tool in isolation
      const weatherResult = await isolatedWeatherFunction({ city: 'Tokyo' });
      expect(weatherResult).toEqual({
        weather: 'sunny',
        city: 'Tokyo',
        temperature: 25,
        humidity: 60
      });

      // Test math tool in isolation
      const mathResult = await isolatedMathFunction({ a: 7, b: 3, operation: 'multiply' });
      expect(mathResult).toEqual({ result: 21 });

      // Verify both tools work independently
      const weatherResult2 = await isolatedWeatherFunction({ city: 'Berlin' });
      const mathResult2 = await isolatedMathFunction({ a: 15, b: 3, operation: 'divide' });
      
      expect(weatherResult2.city).toBe('Berlin');
      expect(mathResult2.result).toBe(5);

    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
  });
});
