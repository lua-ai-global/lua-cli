import { LuaSkill } from '../../src/types/index';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

describe('Deploy Command - External Package Dependencies (Simplified)', () => {
  const testDir = path.join(__dirname, '..', '..', 'test-external-deps-simple');
  
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create a Lua skill project that matches the deploy command's expected format exactly
    const indexTsContent = `import z from "zod";
import { LuaSkill } from "lua-cli/types";
import axios from "axios";

class ApiService {
  constructor() {
    this.baseUrl = "https://api.example.com";
  }

  async fetchData(url: string) {
    try {
      const response = await axios.get(url);
      return {
        data: response.data,
        status: 'success'
      };
    } catch (error: any) {
      return {
        data: null,
        status: 'error',
        error: error.message
      };
    }
  }
}

const apiService = new ApiService();
const skill = new LuaSkill("test-api-key");

const inputSchema = z.object({
  url: z.string().url("Valid URL is required"),
});
const outputSchema = z.object({
  data: z.any().nullable(),
  status: z.string(),
  error: z.string().optional(),
});

skill.addTool({
  name: "fetch_data",
  description: "Fetch data from external URL using axios",
  inputSchema,
  outputSchema,
  execute: async (input: z.infer<typeof inputSchema>) => {
    return apiService.fetchData(input.url);
  },
});
`;

    const packageJsonContent = {
      name: "test-external-deps-simple",
      version: "3.0.0",
      description: "Test Lua skill with external package dependencies",
      type: "module",
      main: "index.ts",
      dependencies: {
        "lua-cli": "file:../..",
        "zod": "^4.1.9",
        "axios": "^1.6.0"
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

  it('should deploy and execute axios-dependent tool end-to-end', async () => {
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
        originalLog(message);
      };
      console.error = (message: any) => {
        deployOutput += message + '\n';
        originalError(message);
      };

      // Run deploy command
      await deployCommand();

      // Restore console
      console.log = originalLog;
      console.error = originalError;

      // Debug: Show deploy output
      process.stdout.write('=== DEPLOY OUTPUT ===\n');
      process.stdout.write(deployOutput + '\n');
      process.stdout.write('=== END DEPLOY OUTPUT ===\n');

      // Extract JSON from deploy output
      const jsonStart = deployOutput.indexOf('{');
      const jsonEnd = deployOutput.lastIndexOf('}') + 1;
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON found in deploy output');
      }
      
      const jsonString = deployOutput.substring(jsonStart, jsonEnd);
      const deployData = JSON.parse(jsonString);

      // Verify deploy output structure
      expect(deployData.version).toBe('3.0.0');
      expect(deployData.skillsName).toBe('test-external-deps-simple');
      expect(deployData.tools).toHaveLength(1);

      // Find fetch data tool
      const fetchTool = deployData.tools.find((tool: any) => tool.name === 'fetch_data');
      expect(fetchTool).toBeDefined();
      expect(fetchTool.description).toBe('Fetch data from external URL using axios');

      // Debug: Show the execute function
      process.stdout.write('=== FETCH TOOL EXECUTE FUNCTION ===\n');
      process.stdout.write(fetchTool.execute + '\n');
      process.stdout.write('=== END FETCH TOOL EXECUTE FUNCTION ===\n');

      // Test the deployable execute function
      const executeFunction = eval(`(${fetchTool.execute})`);
      
      // Test with valid input (this will fail due to network, but should not crash due to missing axios)
      const result = await executeFunction({ url: 'https://httpbin.org/get' });
      
      // Should return error response due to network failure, but not crash due to missing axios
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('error'); // Network will fail, but axios should be available

      // Verify that the execute function includes all necessary dependencies
      expect(fetchTool.execute).toContain('axios');
      expect(fetchTool.execute).toContain('class ApiService');

    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
  });

  it('should verify the execute function is truly self-contained', async () => {
    // Change to test directory
    const originalCwd = process.cwd();
    process.chdir(testDir);

    try {
      // Import and run the deploy command directly
      const { deployCommand } = await import('../../src/commands/deploy');
      
      // Capture output
      const originalLog = console.log;
      let deployOutput = '';
      
      console.log = (message: any) => {
        deployOutput += message + '\n';
        originalLog(message);
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

      // Find fetch data tool
      const fetchTool = deployData.tools.find((tool: any) => tool.name === 'fetch_data');
      
      // Test that the execute function includes axios import/require
      expect(fetchTool.execute).toContain('axios');
      
      // Test that the execute function includes the ApiService class
      expect(fetchTool.execute).toContain('class ApiService');
      expect(fetchTool.execute).toContain('constructor()');
      expect(fetchTool.execute).toContain('this.baseUrl');
      expect(fetchTool.execute).toContain('async fetchData');
      
      // Test that the execute function includes the apiService instance
      expect(fetchTool.execute).toContain('const apiService = new ApiService()');
      
      // Test that the execute function includes the actual method call
      expect(fetchTool.execute).toContain('return apiService.fetchData(input.url)');

    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
  });
});
