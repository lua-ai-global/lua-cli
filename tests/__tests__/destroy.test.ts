import inquirer from 'inquirer';
import { destroyCommand } from '../../src/commands/destroy.js';
import { deleteApiKey } from '../../src/services/auth.js';

// Mock dependencies
jest.mock('inquirer');
jest.mock('../../src/services/auth.js');

const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;
const mockedDeleteApiKey = deleteApiKey as jest.MockedFunction<typeof deleteApiKey>;

describe('Destroy Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should successfully delete API key when confirmed', async () => {
    mockedInquirer.prompt.mockResolvedValueOnce({
      confirm: true
    });

    mockedDeleteApiKey.mockResolvedValue(true);

    await destroyCommand();

    expect(mockedInquirer.prompt).toHaveBeenCalledWith([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to delete your stored API key?',
        default: false
      }
    ]);

    expect(mockedDeleteApiKey).toHaveBeenCalled();
  });

  test('should cancel deletion when not confirmed', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    mockedInquirer.prompt.mockResolvedValueOnce({
      confirm: false
    });

    await destroyCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Deletion cancelled.');

    consoleSpy.mockRestore();
  });

  test('should handle deletion failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedInquirer.prompt.mockResolvedValueOnce({
      confirm: true
    });

    mockedDeleteApiKey.mockResolvedValue(false);

    await destroyCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Failed to delete API key.');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should show success message after successful deletion', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    mockedInquirer.prompt.mockResolvedValueOnce({
      confirm: true
    });

    mockedDeleteApiKey.mockResolvedValue(true);

    await destroyCommand();

    expect(consoleSpy).toHaveBeenCalledWith('✅ API key deleted successfully!');

    consoleSpy.mockRestore();
  });

  test('should handle deletion error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedInquirer.prompt.mockResolvedValueOnce({
      confirm: true
    });

    mockedDeleteApiKey.mockRejectedValue(new Error('Keychain error'));

    await destroyCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Error deleting API key:', expect.any(Error));
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });
});
