import fs from 'fs';
import path from 'path';
import { deployCommand } from '../../src/commands/deploy.js';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock esbuild
jest.mock('esbuild', () => ({
  build: jest.fn()
}));

describe('Deploy Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.cwd
    jest.spyOn(process, 'cwd').mockReturnValue('/test-project');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should successfully deploy with inline tool definitions', async () => {
    const mockPackageJson = {
      version: '1.0.0',
      name: 'test-skill'
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

    // Mock file system operations
    mockedFs.existsSync.mockImplementation((filePath: any) => {
      if (filePath.includes('package.json') || filePath.includes('index.ts')) {
        return true;
      }
      if (filePath.includes('.lua')) {
        return false;
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
      return '';
    });

    mockedFs.mkdirSync.mockImplementation(() => undefined);
    mockedFs.writeFileSync.mockImplementation(() => undefined);

    await deployCommand();

    // Verify .lua directory was created
    expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/test-project/.lua', { recursive: true });

    // Verify deploy.json was written
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      '/test-project/.lua/deploy.json',
      expect.stringContaining('"version": "1.0.0"')
    );

    // Verify tool file was written
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      '/test-project/.lua/get_weather.js',
      expect.any(String)
    );
  });

  test('should handle class-based tool definitions', async () => {
    const mockPackageJson = {
      version: '1.0.0',
      name: 'test-skill'
    };

    const mockIndexContent = `
import { LuaSkill } from "lua-cli/skill";
import GetWeatherTool from "./tools/GetWeatherTool";

const skill = new LuaSkill();
skill.addTool(new GetWeatherTool());
`;

    const mockToolContent = `
import { LuaTool } from "lua-cli/skill";
import { z } from "zod";
import ApiService from "../services/ApiService";

const inputSchema = z.object({
  city: z.string()
});

const outputSchema = z.object({
  temperature: z.number()
});

export default class GetWeatherTool implements LuaTool<typeof inputSchema, typeof outputSchema> {
  name: string;
  description: string;
  inputSchema: typeof inputSchema;
  outputSchema: typeof outputSchema;
  
  apiService: ApiService;

  constructor() {
    this.name = "get_weather";
    this.description = "Get weather for a city";
    this.inputSchema = inputSchema;
    this.outputSchema = outputSchema;
    this.apiService = new ApiService();
  }

  async execute(input: z.infer<typeof inputSchema>) {
    return this.apiService.getWeather(input.city);
  }
}
`;

    // Mock file system operations
    mockedFs.existsSync.mockImplementation((filePath: any) => {
      if (filePath.includes('package.json') || 
          filePath.includes('index.ts') || 
          filePath.includes('tools/GetWeatherTool.ts')) {
        return true;
      }
      if (filePath.includes('.lua')) {
        return false;
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
      if (filePath.includes('tools/GetWeatherTool.ts')) {
        return mockToolContent;
      }
      return '';
    });

    mockedFs.mkdirSync.mockImplementation(() => undefined);
    mockedFs.writeFileSync.mockImplementation(() => undefined);

    await deployCommand();

    // Verify deploy.json was written with tool information
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      '/test-project/.lua/deploy.json',
      expect.stringContaining('"name": "get_weather"')
    );
  });

  test('should handle missing package.json', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedFs.existsSync.mockImplementation((filePath: any) => {
      if (filePath.includes('package.json')) {
        return false;
      }
      return true;
    });

    await deployCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Compilation failed:', 'package.json not found in current directory');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle missing index.ts', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedFs.existsSync.mockImplementation((filePath: any) => {
      if (filePath.includes('package.json')) {
        return true;
      }
      if (filePath.includes('index.ts')) {
        return false;
      }
      return true;
    });

    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (filePath.includes('package.json')) {
        return JSON.stringify({ version: '1.0.0', name: 'test-skill' });
      }
      return '';
    });

    await deployCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Compilation failed:', 'index.ts not found in current directory');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle external dependencies bundling', async () => {
    const mockPackageJson = {
      version: '1.0.0',
      name: 'test-skill'
    };

    const mockIndexContent = `
import { LuaSkill } from "lua-cli/skill";
import { z } from "zod";
import axios from "axios";

const skill = new LuaSkill();

const inputSchema = z.object({
  url: z.string()
});

const outputSchema = z.object({
  data: z.any()
});

skill.addTool({
  name: "fetch_data",
  description: "Fetch data from URL",
  inputSchema: inputSchema,
  outputSchema: outputSchema,
  execute: async (input) => {
    const response = await axios.get(input.url);
    return { data: response.data };
  }
});
`;

    // Mock esbuild
    const { build } = await import('esbuild');
    const mockedBuild = build as jest.MockedFunction<typeof build>;
    
    mockedBuild.mockResolvedValue({
      errors: [],
      warnings: []
    } as any);

    // Mock file system operations
    mockedFs.existsSync.mockImplementation((filePath: any) => {
      if (filePath.includes('package.json') || filePath.includes('index.ts')) {
        return true;
      }
      if (filePath.includes('.lua')) {
        return false;
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
      return '';
    });

    mockedFs.mkdirSync.mockImplementation(() => undefined);
    mockedFs.writeFileSync.mockImplementation(() => undefined);

    await deployCommand();

    // Verify esbuild was called for bundling axios
    expect(mockedBuild).toHaveBeenCalled();
  });
});
