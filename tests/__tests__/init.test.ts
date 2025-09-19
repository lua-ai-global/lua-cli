import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { initCommand } from '../../src/commands/init.js';
import { loadApiKey } from '../../src/services/auth.js';
import { copyTemplateFiles, createSkillToml } from '../../src/utils/files.js';
import fetch from 'node-fetch';

// Mock dependencies
jest.mock('fs');
jest.mock('inquirer');
jest.mock('../../src/services/auth.js');
jest.mock('../../src/utils/files.js');
jest.mock('node-fetch');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;
const mockedLoadApiKey = loadApiKey as jest.MockedFunction<typeof loadApiKey>;
const mockedCopyTemplateFiles = copyTemplateFiles as jest.MockedFunction<typeof copyTemplateFiles>;
const mockedCreateSkillToml = createSkillToml as jest.MockedFunction<typeof createSkillToml>;
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Init Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.cwd
    jest.spyOn(process, 'cwd').mockReturnValue('/test-project');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should successfully initialize a new skill project', async () => {
    const mockUserData = {
      organizations: [
        {
          id: 'org-123',
          name: 'Test Organization',
          agents: [
            { id: 'agent-456', name: 'Test Agent' }
          ]
        }
      ]
    };

    // Mock API key loading
    mockedLoadApiKey.mockResolvedValue('test-api-key');

    // Mock fetch for organizations
    mockedFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockUserData)
    } as any);

    // Mock inquirer prompts
    mockedInquirer.prompt
      .mockResolvedValueOnce({
        selectedOrg: mockUserData.organizations[0]
      })
      .mockResolvedValueOnce({
        selectedAgent: mockUserData.organizations[0].agents[0]
      })
      .mockResolvedValueOnce({
        skillName: 'test-skill',
        skillDescription: 'A test skill'
      });

    await initCommand();

    // Verify API key was loaded
    expect(mockedLoadApiKey).toHaveBeenCalled();

    // Verify organizations were fetched
    expect(mockedFetch).toHaveBeenCalledWith('https://api.heylua.ai/admin', {
      headers: { Authorization: 'Bearer test-api-key' }
    });

    // Verify inquirer prompts were called
    expect(mockedInquirer.prompt).toHaveBeenCalledTimes(3);

    // Verify skill TOML was created
    expect(mockedCreateSkillToml).toHaveBeenCalledWith(
      'agent-456',
      'org-123',
      'test-skill',
      'A test skill'
    );

    // Verify template files were copied
    expect(mockedCopyTemplateFiles).toHaveBeenCalled();
  });

  test('should handle missing API key', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedLoadApiKey.mockResolvedValue(null);

    await initCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ No API key found. Run \'lua configure\' first.');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle API key validation failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedLoadApiKey.mockResolvedValue('invalid-api-key');
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 401
    } as any);

    await initCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Invalid API key');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle no organizations', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    const mockUserData = { organizations: [] };

    mockedLoadApiKey.mockResolvedValue('test-api-key');
    mockedFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockUserData)
    } as any);

    await initCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ No organizations found.');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle no agents in selected organization', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    const mockUserData = {
      organizations: [
        {
          id: 'org-123',
          name: 'Test Organization',
          agents: []
        }
      ]
    };

    mockedLoadApiKey.mockResolvedValue('test-api-key');
    mockedFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockUserData)
    } as any);

    mockedInquirer.prompt.mockResolvedValueOnce({
      selectedOrg: mockUserData.organizations[0]
    });

    await initCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ No agents found in the selected organization.');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle existing lua.skill.toml file', async () => {
    const mockUserData = {
      organizations: [
        {
          id: 'org-123',
          name: 'Test Organization',
          agents: [
            { id: 'agent-456', name: 'Test Agent' }
          ]
        }
      ]
    };

    mockedLoadApiKey.mockResolvedValue('test-api-key');
    mockedFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockUserData)
    } as any);

    // Mock existing lua.skill.toml file
    mockedFs.existsSync.mockImplementation((filePath: any) => {
      if (filePath.includes('lua.skill.toml')) {
        return true;
      }
      return false;
    });

    mockedInquirer.prompt
      .mockResolvedValueOnce({
        selectedOrg: mockUserData.organizations[0]
      })
      .mockResolvedValueOnce({
        selectedAgent: mockUserData.organizations[0].agents[0]
      })
      .mockResolvedValueOnce({
        skillName: 'test-skill',
        skillDescription: 'A test skill'
      })
      .mockResolvedValueOnce({
        overwrite: true
      });

    await initCommand();

    // Verify overwrite prompt was shown
    expect(mockedInquirer.prompt).toHaveBeenCalledTimes(4);
  });

  test('should handle user cancellation during overwrite prompt', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const mockUserData = {
      organizations: [
        {
          id: 'org-123',
          name: 'Test Organization',
          agents: [
            { id: 'agent-456', name: 'Test Agent' }
          ]
        }
      ]
    };

    mockedLoadApiKey.mockResolvedValue('test-api-key');
    mockedFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockUserData)
    } as any);

    // Mock existing lua.skill.toml file
    mockedFs.existsSync.mockImplementation((filePath: any) => {
      if (filePath.includes('lua.skill.toml')) {
        return true;
      }
      return false;
    });

    mockedInquirer.prompt
      .mockResolvedValueOnce({
        selectedOrg: mockUserData.organizations[0]
      })
      .mockResolvedValueOnce({
        selectedAgent: mockUserData.organizations[0].agents[0]
      })
      .mockResolvedValueOnce({
        skillName: 'test-skill',
        skillDescription: 'A test skill'
      })
      .mockResolvedValueOnce({
        overwrite: false
      });

    await initCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Initialization cancelled.');

    consoleSpy.mockRestore();
  });
});
