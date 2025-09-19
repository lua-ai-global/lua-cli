import { LuaSkill } from '../../src/types/index';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

describe('Deploy Command - External Package Dependencies', () => {
  const testDir = path.join(__dirname, '..', '..', 'test-external-deps-project');
  
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create a Lua skill project that uses external packages
    const indexTsContent = `import z from "zod";
import { LuaSkill } from "lua-cli/types";
import axios from "axios";

class ApiService {
  constructor() {
    this.baseUrl = "https://api.example.com";
    this.timeout = 5000;
  }

  async fetchUserData(userId: string) {
    try {
      const response = await axios.get(\`\${this.baseUrl}/users/\${userId}\`, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Lua-Skill/1.0'
        }
      });
      
      return {
        id: response.data.id,
        name: response.data.name,
        email: response.data.email,
        status: 'success'
      };
    } catch (error: any) {
      return {
        id: userId,
        name: 'Unknown',
        email: 'unknown@example.com',
        status: 'error',
        error: error.message
      };
    }
  }

  async createPost(title: string, content: string) {
    try {
      const response = await axios.post(\`\${this.baseUrl}/posts\`, {
        title,
        content,
        publishedAt: new Date().toISOString()
      }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return {
        id: response.data.id,
        title: response.data.title,
        status: 'created'
      };
    } catch (error: any) {
      return {
        id: null,
        title,
        status: 'error',
        error: error.message
      };
    }
  }
}

class CryptoService {
  constructor() {
    this.secretKey = "my-secret-key-123";
  }

  async hashPassword(password: string) {
    // Simulate crypto operations that might use external libraries
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(password + this.secretKey).digest('hex');
    
    return {
      hash,
      algorithm: 'sha256',
      salt: this.secretKey
    };
  }

  async generateToken(userId: string) {
    const crypto = require('crypto');
    const timestamp = Date.now().toString();
    const token = crypto.createHash('md5').update(userId + timestamp + this.secretKey).digest('hex');
    
    return {
      token,
      userId,
      expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
    };
  }
}

const apiService = new ApiService();
const cryptoService = new CryptoService();
const skill = new LuaSkill("test-api-key");

// User data tool
const userInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});
const userOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  status: z.string(),
  error: z.string().optional(),
});

skill.addTool({
  name: "get_user_data",
  description: "Fetch user data from external API using axios",
  inputSchema: userInputSchema,
  outputSchema: userOutputSchema,
  execute: async (input: z.infer<typeof userInputSchema>) => {
    return apiService.fetchUserData(input.userId);
  },
});

// Post creation tool
const postInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});
const postOutputSchema = z.object({
  id: z.string().nullable(),
  title: z.string(),
  status: z.string(),
  error: z.string().optional(),
});

skill.addTool({
  name: "create_post",
  description: "Create a new post using external API with axios",
  inputSchema: postInputSchema,
  outputSchema: postOutputSchema,
  execute: async (input: z.infer<typeof postInputSchema>) => {
    return apiService.createPost(input.title, input.content);
  },
});

// Password hashing tool
const passwordInputSchema = z.object({
  password: z.string().min(1, "Password is required"),
});
const passwordOutputSchema = z.object({
  hash: z.string(),
  algorithm: z.string(),
  salt: z.string(),
});

skill.addTool({
  name: "hash_password",
  description: "Hash password using crypto library",
  inputSchema: passwordInputSchema,
  outputSchema: passwordOutputSchema,
  execute: async (input: z.infer<typeof passwordInputSchema>) => {
    return cryptoService.hashPassword(input.password);
  },
});

// Token generation tool
const tokenInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});
const tokenOutputSchema = z.object({
  token: z.string(),
  userId: z.string(),
  expiresAt: z.string(),
});

skill.addTool({
  name: "generate_token",
  description: "Generate authentication token using crypto library",
  inputSchema: tokenInputSchema,
  outputSchema: tokenOutputSchema,
  execute: async (input: z.infer<typeof tokenInputSchema>) => {
    return cryptoService.generateToken(input.userId);
  },
});
`;

    const packageJsonContent = {
      name: "test-external-deps-skill",
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
      expect(deployData.skillsName).toBe('test-external-deps-skill');
      expect(deployData.tools).toHaveLength(4);

      // Find user data tool
      const userTool = deployData.tools.find((tool: any) => tool.name === 'get_user_data');
      expect(userTool).toBeDefined();
      expect(userTool.description).toBe('Fetch user data from external API using axios');

      // Debug: Show the execute function
      process.stdout.write('=== USER TOOL EXECUTE FUNCTION ===\n');
      process.stdout.write(userTool.execute + '\n');
      process.stdout.write('=== END USER TOOL EXECUTE FUNCTION ===\n');

      // Test the deployable execute function
      const executeFunction = eval(`(${userTool.execute})`);
      
      // Test with valid input (this will fail due to network, but should not crash due to missing axios)
      const result = await executeFunction({ userId: '123' });
      
      // Should return error response due to network failure, but not crash due to missing axios
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('error'); // Network will fail, but axios should be available

    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
  });

  it('should deploy and execute crypto-dependent tool end-to-end', async () => {
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

      // Find password hashing tool
      const passwordTool = deployData.tools.find((tool: any) => tool.name === 'hash_password');
      expect(passwordTool).toBeDefined();

      // Debug: Show the execute function
      process.stdout.write('=== PASSWORD TOOL EXECUTE FUNCTION ===\n');
      process.stdout.write(passwordTool.execute + '\n');
      process.stdout.write('=== END PASSWORD TOOL EXECUTE FUNCTION ===\n');

      // Test the deployable execute function
      const executeFunction = eval(`(${passwordTool.execute})`);
      
      // Test with valid input
      const result = await executeFunction({ password: 'mypassword123' });
      
      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('algorithm');
      expect(result).toHaveProperty('salt');
      expect(result.algorithm).toBe('sha256');
      expect(result.salt).toBe('my-secret-key-123');
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/); // SHA256 hash format

    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
  });

  it('should deploy and execute token generation tool end-to-end', async () => {
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

      // Find token generation tool
      const tokenTool = deployData.tools.find((tool: any) => tool.name === 'generate_token');
      expect(tokenTool).toBeDefined();

      // Debug: Show the execute function
      process.stdout.write('=== TOKEN TOOL EXECUTE FUNCTION ===\n');
      process.stdout.write(tokenTool.execute + '\n');
      process.stdout.write('=== END TOKEN TOOL EXECUTE FUNCTION ===\n');

      // Test the deployable execute function
      const executeFunction = eval(`(${tokenTool.execute})`);
      
      // Test with valid input
      const result = await executeFunction({ userId: 'user123' });
      
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('expiresAt');
      expect(result.userId).toBe('user123');
      expect(result.token).toMatch(/^[a-f0-9]{32}$/); // MD5 hash format
      expect(new Date(result.expiresAt)).toBeInstanceOf(Date);

    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
  });

  it('should verify all tools work independently without external dependencies', async () => {
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

      // Test all tools in isolation (simulating remote execution without node_modules)
      const userTool = deployData.tools.find((tool: any) => tool.name === 'get_user_data');
      const postTool = deployData.tools.find((tool: any) => tool.name === 'create_post');
      const passwordTool = deployData.tools.find((tool: any) => tool.name === 'hash_password');
      const tokenTool = deployData.tools.find((tool: any) => tool.name === 'generate_token');

      // Create isolated execution environments
      const isolatedUserFunction = eval(`(${userTool.execute})`);
      const isolatedPostFunction = eval(`(${postTool.execute})`);
      const isolatedPasswordFunction = eval(`(${passwordTool.execute})`);
      const isolatedTokenFunction = eval(`(${tokenTool.execute})`);

      // Test password hashing (should work - uses built-in crypto)
      const passwordResult = await isolatedPasswordFunction({ password: 'testpass' });
      expect(passwordResult.algorithm).toBe('sha256');

      // Test token generation (should work - uses built-in crypto)
      const tokenResult = await isolatedTokenFunction({ userId: 'testuser' });
      expect(tokenResult.userId).toBe('testuser');

      // Test API calls (will fail due to network, but should not crash due to missing axios)
      const userResult = await isolatedUserFunction({ userId: '123' });
      expect(userResult.status).toBe('error'); // Network failure expected

      const postResult = await isolatedPostFunction({ title: 'Test', content: 'Content' });
      expect(postResult.status).toBe('error'); // Network failure expected

      // Verify that the execute functions include all necessary dependencies
      expect(userTool.execute).toContain('axios');
      expect(userTool.execute).toContain('class ApiService');
      expect(passwordTool.execute).toContain('require(\'crypto\')');
      expect(passwordTool.execute).toContain('class CryptoService');

    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
  });
});
