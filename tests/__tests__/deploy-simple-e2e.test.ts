import { LuaSkill } from '../../src/types/index';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('Deploy Command - End-to-End Tests', () => {
  const testDir = path.join(__dirname, '..', '..', 'test-deploy-project');
  
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create a real Lua skill project that matches the deploy command's expected format
    const indexTsContent = `import z from "zod";
import { LuaSkill } from "lua-cli/types";

class WeatherService {
  constructor() {
    this.apiKey = "test-api-key";
  }

  async getWeather(city: string) {
    await new Promise(resolve => setTimeout(resolve, 10));
    return { 
      weather: "sunny", 
      city: city,
      temperature: 25,
      humidity: 60
    };
  }
}

const weatherService = new WeatherService();
const skill = new LuaSkill("test-api-key");

const inputSchema = z.object({
  city: z.string().min(1, "City name is required"),
});
const outputSchema = z.object({
  weather: z.string(),
  city: z.string(),
  temperature: z.number(),
  humidity: z.number(),
});

skill.addTool({
  name: "get_weather",
  description: "Get weather information for a city",
  inputSchema,
  outputSchema,
  execute: async (input: z.infer<typeof inputSchema>) => {
    return weatherService.getWeather(input.city);
  },
});
`;

    const packageJsonContent = {
      name: "test-lua-skill",
      version: "2.0.0",
      description: "Test Lua skill for end-to-end deploy testing",
      type: "module",
      main: "index.ts",
      dependencies: {
        "lua-cli": "file:../..",
        "zod": "^4.1.9"
      }
    };

    // Write files
    fs.writeFileSync(path.join(testDir, 'index.ts'), indexTsContent);
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJsonContent, null, 2));
    
    // Debug: Verify files were created
    console.log('Test directory created:', testDir);
    console.log('Files created:', fs.readdirSync(testDir));
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
      // Check if files exist
      expect(fs.existsSync('index.ts')).toBe(true);
      expect(fs.existsSync('package.json')).toBe(true);

      // Import and run the deploy command directly
      const { deployCommand } = await import('../../src/commands/deploy');
      
      // Capture output by temporarily replacing console methods
      const originalLog = console.log;
      const originalError = console.error;
      let deployOutput = '';
      
      console.log = (message: any) => {
        deployOutput += message + '\n';
        originalLog(message); // Also log to see in test output
      };
      console.error = (message: any) => {
        deployOutput += message + '\n';
        originalError(message); // Also log to see in test output
      };

      // Run deploy command
      await deployCommand();

      // Restore console
      console.log = originalLog;
      console.error = originalError;

      // Debug: Show deploy output
      console.log('=== DEPLOY OUTPUT ===');
      console.log(deployOutput);
      console.log('=== END DEPLOY OUTPUT ===');

      // Extract JSON from deploy output
      const jsonStart = deployOutput.indexOf('{');
      const jsonEnd = deployOutput.lastIndexOf('}') + 1;
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON found in deploy output');
      }
      
      const jsonString = deployOutput.substring(jsonStart, jsonEnd);
      const deployData = JSON.parse(jsonString);

      // Verify deploy output structure
      expect(deployData.version).toBe('2.0.0');
      expect(deployData.skillsName).toBe('test-lua-skill');
      expect(deployData.tools).toHaveLength(1);

      // Find weather tool
      const weatherTool = deployData.tools.find((tool: any) => tool.name === 'get_weather');
      expect(weatherTool).toBeDefined();
      expect(weatherTool.description).toBe('Get weather information for a city');

      // Debug: Show the execute function
      process.stdout.write('=== EXECUTE FUNCTION ===\n');
      process.stdout.write(weatherTool.execute + '\n');
      process.stdout.write('=== END EXECUTE FUNCTION ===\n');

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

    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
  });
});
