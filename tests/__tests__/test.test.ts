import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { testCommand } from '../../src/commands/test.js';
import { deployCommand } from '../../src/commands/deploy.js';

// Mock dependencies
jest.mock('fs');
jest.mock('inquirer');
jest.mock('../../src/commands/deploy.js');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;
const mockedDeployCommand = deployCommand as jest.MockedFunction<typeof deployCommand>;

describe('Test Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.cwd
    jest.spyOn(process, 'cwd').mockReturnValue('/test-project');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should successfully test a tool', async () => {
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

    // Mock inquirer prompts
    mockedInquirer.prompt.mockResolvedValueOnce({
      selectedTool: mockDeployData.tools[0]
    }).mockResolvedValueOnce({
      city: 'London'
    });

    await testCommand();

    // Verify deploy command was called
    expect(mockedDeployCommand).toHaveBeenCalled();

    // Verify inquirer prompts were called
    expect(mockedInquirer.prompt).toHaveBeenCalledTimes(2);
  });

  test('should handle missing .lua directory', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedFs.existsSync.mockImplementation((filePath: any) => {
      if (filePath.includes('.lua')) {
        return false;
      }
      return true;
    });

    await testCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Test failed:', '.lua directory not found. Run \'lua compile\' first.');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle missing deploy.json', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    // Mock deploy command to fail
    mockedDeployCommand.mockImplementation(() => {
      console.error('❌ Test failed:', 'deploy.json not found. Run \'lua compile\' first.');
      process.exit(1);
    });

    await testCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Test failed:', 'deploy.json not found. Run \'lua compile\' first.');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle no tools in deploy.json', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    const mockDeployData = { tools: [] };

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

    await testCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Test failed:', 'No tools found in deploy.json');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle tool execution with multiple input parameters', async () => {
    const mockDeployData = {
      tools: [
        {
          name: 'create_post',
          description: 'Create a new post',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
              published: { type: 'boolean' }
            },
            required: ['title', 'content']
          }
        }
      ]
    };

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

    // Mock inquirer prompts for multiple parameters
    mockedInquirer.prompt.mockResolvedValueOnce({
      selectedTool: mockDeployData.tools[0]
    }).mockResolvedValueOnce({
      title: 'Test Post',
      content: 'This is test content',
      published: true
    });

    await testCommand();

    // Verify prompts were called for tool selection and input parameters
    expect(mockedInquirer.prompt).toHaveBeenCalledTimes(2);
  });

  test('should handle tool execution error', async () => {
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

    // Mock inquirer prompts
    mockedInquirer.prompt.mockResolvedValueOnce({
      selectedTool: mockDeployData.tools[0]
    }).mockResolvedValueOnce({
      city: 'London'
    });

    // Mock tool execution to throw an error
    const mockToolFile = 'async (input) => { throw new Error("API Error"); }';
    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      if (filePath.includes('deploy.json')) {
        return JSON.stringify(mockDeployData);
      }
      if (filePath.includes('get_weather.js')) {
        return mockToolFile;
      }
      return '';
    });

    await testCommand();

    // The test should complete without throwing
    expect(mockedInquirer.prompt).toHaveBeenCalledTimes(2);
  });
});
