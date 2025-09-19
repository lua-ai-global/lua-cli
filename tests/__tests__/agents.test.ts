import fetch from 'node-fetch';
import { agentsCommand } from '../../src/commands/agents.js';
import { loadApiKey } from '../../src/services/auth.js';

// Mock dependencies
jest.mock('node-fetch');
jest.mock('../../src/services/auth.js');

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockedLoadApiKey = loadApiKey as jest.MockedFunction<typeof loadApiKey>;

describe('Agents Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should successfully display agents', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const mockUserData = {
      organizations: [
        {
          id: 'org-123',
          name: 'Test Organization',
          agents: [
            { id: 'agent-456', name: 'Test Agent 1' },
            { id: 'agent-789', name: 'Test Agent 2' }
          ]
        },
        {
          id: 'org-456',
          name: 'Another Organization',
          agents: [
            { id: 'agent-101', name: 'Another Agent' }
          ]
        }
      ]
    };

    mockedLoadApiKey.mockResolvedValue('test-api-key');
    mockedFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockUserData)
    } as any);

    await agentsCommand();

    expect(mockedLoadApiKey).toHaveBeenCalled();
    expect(mockedFetch).toHaveBeenCalledWith('https://api.heylua.ai/admin', {
      headers: { Authorization: 'Bearer test-api-key' }
    });

    // Verify agents are displayed
    expect(consoleSpy).toHaveBeenCalledWith('🤖 Your Agents:');
    expect(consoleSpy).toHaveBeenCalledWith('');
    expect(consoleSpy).toHaveBeenCalledWith('📁 Test Organization');
    expect(consoleSpy).toHaveBeenCalledWith('  • Test Agent 1 (agent-456)');
    expect(consoleSpy).toHaveBeenCalledWith('  • Test Agent 2 (agent-789)');
    expect(consoleSpy).toHaveBeenCalledWith('');
    expect(consoleSpy).toHaveBeenCalledWith('📁 Another Organization');
    expect(consoleSpy).toHaveBeenCalledWith('  • Another Agent (agent-101)');

    consoleSpy.mockRestore();
  });

  test('should handle missing API key', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedLoadApiKey.mockResolvedValue(null);

    await agentsCommand();

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

    await agentsCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Invalid API key');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle no organizations', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const mockUserData = { organizations: [] };

    mockedLoadApiKey.mockResolvedValue('test-api-key');
    mockedFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockUserData)
    } as any);

    await agentsCommand();

    expect(consoleSpy).toHaveBeenCalledWith('🤖 Your Agents:');
    expect(consoleSpy).toHaveBeenCalledWith('');
    expect(consoleSpy).toHaveBeenCalledWith('No organizations found.');

    consoleSpy.mockRestore();
  });

  test('should handle organizations with no agents', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const mockUserData = {
      organizations: [
        {
          id: 'org-123',
          name: 'Empty Organization',
          agents: []
        }
      ]
    };

    mockedLoadApiKey.mockResolvedValue('test-api-key');
    mockedFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockUserData)
    } as any);

    await agentsCommand();

    expect(consoleSpy).toHaveBeenCalledWith('🤖 Your Agents:');
    expect(consoleSpy).toHaveBeenCalledWith('');
    expect(consoleSpy).toHaveBeenCalledWith('📁 Empty Organization');
    expect(consoleSpy).toHaveBeenCalledWith('  No agents found.');

    consoleSpy.mockRestore();
  });

  test('should handle API request error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedLoadApiKey.mockResolvedValue('test-api-key');
    mockedFetch.mockRejectedValue(new Error('Network error'));

    await agentsCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Error fetching agents:', expect.any(Error));
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle malformed API response', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedLoadApiKey.mockResolvedValue('test-api-key');
    mockedFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}) // Missing organizations field
    } as any);

    await agentsCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Error fetching agents:', expect.any(Error));
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });
});
