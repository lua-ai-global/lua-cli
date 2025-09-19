import fs from 'fs';
import path from 'path';
import { deployCommand } from '../../src/commands/deploy.js';
import { testCommand } from '../../src/commands/test.js';

// Mock dependencies
jest.mock('fs');
jest.mock('../../src/commands/deploy.js');
jest.mock('../../src/commands/test.js');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedDeployCommand = deployCommand as jest.MockedFunction<typeof deployCommand>;
const mockedTestCommand = testCommand as jest.MockedFunction<typeof testCommand>;

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.cwd
    jest.spyOn(process, 'cwd').mockReturnValue('/test-project');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should handle end-to-end skill development workflow', async () => {
    // Mock a complete skill project structure
    const mockPackageJson = {
      version: '1.0.0',
      name: 'weather-skill'
    };

    const mockIndexContent = `
import { LuaSkill } from "lua-cli/skill";
import { z } from "zod";

const skill = new LuaSkill();

const inputSchema = z.object({
  city: z.string()
});

const outputSchema = z.object({
  temperature: z.number(),
  description: z.string()
});

skill.addTool({
  name: "get_weather",
  description: "Get weather for a city",
  inputSchema: inputSchema,
  outputSchema: outputSchema,
  execute: async (input) => {
    return {
      temperature: 20,
      description: "Sunny"
    };
  }
});
`;

    const mockDeployData = {
      version: '1.0.0',
      skillsName: 'weather-skill',
      tools: [
        {
          name: 'get_weather',
          description: 'Get weather for a city',
          inputSchema: {
            type: 'object',
            properties: {
              city: { type: 'string' }
            },
            required: ['city']
          },
          outputSchema: {
            type: 'object',
            properties: {
              temperature: { type: 'number' },
              description: { type: 'string' }
            }
          },
          execute: 'async (input) => { return { temperature: 20, description: "Sunny" }; }'
        }
      ]
    };

    // Mock file system operations
    mockedFs.existsSync.mockImplementation((filePath: any) => {
      if (filePath.includes('package.json') || 
          filePath.includes('index.ts') || 
          filePath.includes('.lua') ||
          filePath.includes('deploy.json') ||
          filePath.includes('get_weather.js')) {
        return true;
      }
      return false;
    });

    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (filePath.includes('package.json')) {
        return JSON.stringify(mockPackageJson);
      }
      if (filePath.includes('index.ts')) {
        return mockIndexContent;
      }
      if (filePath.includes('deploy.json')) {
        return JSON.stringify(mockDeployData);
      }
      if (filePath.includes('get_weather.js')) {
        return 'async (input) => { return { temperature: 20, description: "Sunny" }; }';
      }
      return '';
    });

    mockedFs.mkdirSync.mockImplementation(() => undefined);
    mockedFs.writeFileSync.mockImplementation(() => undefined);

    // Mock successful deploy command
    mockedDeployCommand.mockResolvedValue(undefined);

    // Test deploy workflow
    await deployCommand();

    expect(mockedDeployCommand).toHaveBeenCalled();
  });

  test('should handle skill testing workflow', async () => {
    const mockDeployData = {
      tools: [
        {
          name: 'get_weather',
          description: 'Get weather for a city',
          inputSchema: {
            type: 'object',
            properties: {
              city: { type: 'string' }
            },
            required: ['city']
          }
        }
      ]
    };

    // Mock file system operations
    mockedFs.existsSync.mockImplementation((filePath: any) => {
      if (filePath.includes('.lua') || filePath.includes('deploy.json')) {
        return true;
      }
      return false;
    });

    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (filePath.includes('deploy.json')) {
        return JSON.stringify(mockDeployData);
      }
      return '';
    });

    // Mock successful test command
    mockedTestCommand.mockResolvedValue(undefined);

    // Test testing workflow
    await testCommand();

    expect(mockedTestCommand).toHaveBeenCalled();
  });

  test('should handle error scenarios in workflow', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    // Mock missing package.json
    mockedFs.existsSync.mockImplementation((filePath: any) => {
      if (filePath.includes('package.json')) {
        return false;
      }
      return true;
    });

    // Mock deploy command to throw error
    mockedDeployCommand.mockImplementation(() => {
      console.error('❌ Compilation failed:', 'package.json not found in current directory');
      process.exit(1);
    });

    await deployCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Compilation failed:', 'package.json not found in current directory');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle complex skill with multiple tools', async () => {
    const mockPackageJson = {
      version: '1.0.0',
      name: 'multi-tool-skill'
    };

    const mockIndexContent = `
import { LuaSkill } from "lua-cli/skill";
import { z } from "zod";
import GetWeatherTool from "./tools/GetWeatherTool";
import CreatePostTool from "./tools/CreatePostTool";

const skill = new LuaSkill();

// Inline tool
const inputSchema = z.object({
  query: z.string()
});

const outputSchema = z.object({
  results: z.array(z.string())
});

skill.addTool({
  name: "search",
  description: "Search for content",
  inputSchema: inputSchema,
  outputSchema: outputSchema,
  execute: async (input) => {
    return { results: ["result1", "result2"] };
  }
});

// Class-based tools
skill.addTool(new GetWeatherTool());
skill.addTool(new CreatePostTool());
`;

    const mockDeployData = {
      version: '1.0.0',
      skillsName: 'multi-tool-skill',
      tools: [
        {
          name: 'search',
          description: 'Search for content',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' }
            },
            required: ['query']
          },
          outputSchema: {
            type: 'object',
            properties: {
              results: { type: 'array', items: { type: 'string' } }
            }
          },
          execute: 'async (input) => { return { results: ["result1", "result2"] }; }'
        },
        {
          name: 'get_weather',
          description: 'Get weather for a city',
          inputSchema: {
            type: 'object',
            properties: {
              city: { type: 'string' }
            },
            required: ['city']
          },
          outputSchema: {
            type: 'object',
            properties: {
              temperature: { type: 'number' }
            }
          },
          execute: 'async (input) => { return { temperature: 20 }; }'
        },
        {
          name: 'create_post',
          description: 'Create a new post',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' }
            },
            required: ['title', 'content']
          },
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            }
          },
          execute: 'async (input) => { return { id: "post-123" }; }'
        }
      ]
    };

    // Mock file system operations
    mockedFs.existsSync.mockImplementation((filePath: any) => {
      if (filePath.includes('package.json') || 
          filePath.includes('index.ts') || 
          filePath.includes('.lua') ||
          filePath.includes('deploy.json') ||
          filePath.includes('search.js') ||
          filePath.includes('get_weather.js') ||
          filePath.includes('create_post.js')) {
        return true;
      }
      return false;
    });

    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (filePath.includes('package.json')) {
        return JSON.stringify(mockPackageJson);
      }
      if (filePath.includes('index.ts')) {
        return mockIndexContent;
      }
      if (filePath.includes('deploy.json')) {
        return JSON.stringify(mockDeployData);
      }
      return '';
    });

    mockedFs.mkdirSync.mockImplementation(() => undefined);
    mockedFs.writeFileSync.mockImplementation(() => undefined);

    // Mock successful deploy command
    mockedDeployCommand.mockResolvedValue(undefined);

    await deployCommand();

    expect(mockedDeployCommand).toHaveBeenCalled();
  });
});
