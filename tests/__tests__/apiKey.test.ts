import inquirer from 'inquirer';
import { apiKeyCommand } from '../../src/commands/apiKey.js';
import { loadApiKey } from '../../src/services/auth.js';

// Mock dependencies
jest.mock('inquirer');
jest.mock('../../src/services/auth.js');

const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;
const mockedLoadApiKey = loadApiKey as jest.MockedFunction<typeof loadApiKey>;

describe('API Key Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should display API key when confirmed', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    mockedInquirer.prompt.mockResolvedValueOnce({
      confirm: true
    });

    mockedLoadApiKey.mockResolvedValue('test-api-key');

    await apiKeyCommand();

    expect(mockedInquirer.prompt).toHaveBeenCalledWith([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to view your API key?',
        default: false
      }
    ]);

    expect(consoleSpy).toHaveBeenCalledWith('🔑 Your API key:');
    expect(consoleSpy).toHaveBeenCalledWith('test-api-key');

    consoleSpy.mockRestore();
  });

  test('should cancel display when not confirmed', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    mockedInquirer.prompt.mockResolvedValueOnce({
      confirm: false
    });

    await apiKeyCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Display cancelled.');

    consoleSpy.mockRestore();
  });

  test('should handle no API key found', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedInquirer.prompt.mockResolvedValueOnce({
      confirm: true
    });

    mockedLoadApiKey.mockResolvedValue(null);

    await apiKeyCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ No API key found. Run \'lua configure\' first.');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle API key loading error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedInquirer.prompt.mockResolvedValueOnce({
      confirm: true
    });

    mockedLoadApiKey.mockRejectedValue(new Error('Keychain error'));

    await apiKeyCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Error loading API key:', expect.any(Error));
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should mask API key in logs for security', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    mockedInquirer.prompt.mockResolvedValueOnce({
      confirm: true
    });

    mockedLoadApiKey.mockResolvedValue('sk-1234567890abcdef');

    await apiKeyCommand();

    // Verify the actual API key is displayed (not masked)
    expect(consoleSpy).toHaveBeenCalledWith('sk-1234567890abcdef');

    consoleSpy.mockRestore();
  });
});
