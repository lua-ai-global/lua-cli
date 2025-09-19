import { deployCommand } from '../../src/commands/deploy';
import fs from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('deployCommand', () => {
  const mockPackageJson = {
    version: '1.0.0',
    name: 'test-skill',
  };

  const mockIndexTs = `
import z from "zod";
import { LuaSkill } from "lua-cli/types";

class WeatherService {
  constructor() {
  }

  async getWeather(city: string) {
    return { weather: "sunny", city: city };
  }
}

const weatherService = new WeatherService();

const skill = new LuaSkill("123");
const inputSchema = z.object({
  city: z.string(),
});
const outputSchema = z.object({
  weather: z.string(),
});

skill.addTool({
  name: "get_weather",
  description: "Get the weather for a given city",
  inputSchema,
  outputSchema,
  execute: async (input: z.infer<typeof inputSchema>) => {
    return weatherService.getWeather(input.city);
  },
});
`;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console.log to capture output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    
    // Mock fs methods
    mockedFs.existsSync.mockImplementation((filePath: any) => {
      return filePath === 'index.ts' || filePath === 'package.json';
    });
    
    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (filePath === 'package.json') {
        return JSON.stringify(mockPackageJson);
      }
      if (filePath === 'index.ts') {
        return mockIndexTs;
      }
      return '';
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should generate deployable format successfully', async () => {
    // Don't mock console.log for this test to see actual output
    jest.restoreAllMocks();
    
    try {
      await deployCommand();
    } catch (error) {
      console.error('Deploy command failed:', error);
      throw error;
    }

    // Just check that it doesn't throw an error
    expect(true).toBe(true);
  });

  it('should extract input schema correctly', async () => {
    await deployCommand();

    const output = (console.log as jest.Mock).mock.calls
      .map(call => call[0])
      .join('\n');
    
    // Extract JSON from console output (skip emoji and other text)
    const jsonStart = output.indexOf('{');
    const jsonEnd = output.lastIndexOf('}') + 1;
    const jsonString = output.substring(jsonStart, jsonEnd);
    const deployOutput = JSON.parse(jsonString);
    const tool = deployOutput.tools[0];
    
    expect(tool.inputSchema).toEqual({
      type: 'object',
      properties: {
        city: {
          type: 'string',
        },
      },
      required: ['city'],
    });
  });

  it('should extract output schema correctly', async () => {
    await deployCommand();

    const output = (console.log as jest.Mock).mock.calls
      .map(call => call[0])
      .join('\n');
    
    // Extract JSON from console output (skip emoji and other text)
    const jsonStart = output.indexOf('{');
    const jsonEnd = output.lastIndexOf('}') + 1;
    const jsonString = output.substring(jsonStart, jsonEnd);
    const deployOutput = JSON.parse(jsonString);
    const tool = deployOutput.tools[0];
    
    expect(tool.outputSchema).toEqual({
      type: 'object',
      properties: {
        weather: {
          type: 'string',
        },
      },
      required: ['weather'],
    });
  });

  it('should create self-contained execute function', async () => {
    await deployCommand();

    const output = (console.log as jest.Mock).mock.calls
      .map(call => call[0])
      .join('\n');
    
    // Extract JSON from console output (skip emoji and other text)
    const jsonStart = output.indexOf('{');
    const jsonEnd = output.lastIndexOf('}') + 1;
    const jsonString = output.substring(jsonStart, jsonEnd);
    const deployOutput = JSON.parse(jsonString);
    const tool = deployOutput.tools[0];
    
    expect(tool.execute).toContain('const weatherService = new WeatherService()');
    expect(tool.execute).toContain('return weatherService.getWeather(input.city)');
  });

  it('should throw error when index.ts is missing', async () => {
    mockedFs.existsSync.mockImplementation((filePath: any) => {
      return filePath === 'package.json';
    });

    await deployCommand();

    expect(console.error).toHaveBeenCalledWith(
      '❌ No index.ts found. Make sure you\'re in a Lua skill directory.'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should throw error when package.json is missing', async () => {
    mockedFs.existsSync.mockImplementation((filePath: any) => {
      return filePath === 'index.ts';
    });

    await deployCommand();

    expect(console.error).toHaveBeenCalledWith(
      '❌ No package.json found. Make sure you\'re in a Lua skill directory.'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle tools without dependencies', async () => {
    const simpleIndexTs = `
import z from "zod";
import { LuaSkill } from "lua-cli/types";

const skill = new LuaSkill("123");
const inputSchema = z.object({
  message: z.string(),
});
const outputSchema = z.object({
  response: z.string(),
});

skill.addTool({
  name: "echo",
  description: "Echo a message",
  inputSchema,
  outputSchema,
  execute: async (input) => {
    return { response: input.message };
  },
});
`;

    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (filePath === 'package.json') {
        return JSON.stringify(mockPackageJson);
      }
      if (filePath === 'index.ts') {
        return simpleIndexTs;
      }
      return '';
    });

    await deployCommand();

    const output = (console.log as jest.Mock).mock.calls
      .map(call => call[0])
      .join('\n');
    
    // Extract JSON from console output (skip emoji and other text)
    const jsonStart = output.indexOf('{');
    const jsonEnd = output.lastIndexOf('}') + 1;
    const jsonString = output.substring(jsonStart, jsonEnd);
    const deployOutput = JSON.parse(jsonString);
    const tool = deployOutput.tools[0];
    
    expect(tool.execute).toContain('return { response: input.message }');
    expect(tool.execute).not.toContain('class ');
  });
});
