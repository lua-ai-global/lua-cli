import inquirer from 'inquirer';
import { configureCommand } from '../../src/commands/configure.js';
import { 
  saveApiKey, 
  checkApiKey, 
  requestEmailOTP, 
  verifyOTPAndGetToken, 
  generateApiKey 
} from '../../src/services/auth.js';

// Mock dependencies
jest.mock('inquirer');
jest.mock('../../src/services/auth.js');

const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;
const mockedSaveApiKey = saveApiKey as jest.MockedFunction<typeof saveApiKey>;
const mockedCheckApiKey = checkApiKey as jest.MockedFunction<typeof checkApiKey>;
const mockedRequestEmailOTP = requestEmailOTP as jest.MockedFunction<typeof requestEmailOTP>;
const mockedVerifyOTPAndGetToken = verifyOTPAndGetToken as jest.MockedFunction<typeof verifyOTPAndGetToken>;
const mockedGenerateApiKey = generateApiKey as jest.MockedFunction<typeof generateApiKey>;

describe('Configure Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should configure with API key method successfully', async () => {
    const mockUserData = {
      uid: 'user-123',
      email: 'test@example.com',
      emailVerified: true,
      fullName: 'Test User',
      mobileNumbers: [],
      emailAddresses: [{ address: 'test@example.com', validated: true, validatedAt: Date.now(), _id: 'email-1' }],
      country: { code: 'US', name: 'United States' },
      admin: {
        userId: 'user-123',
        orgs: [],
        id: 'admin-123',
        createdAt: Date.now(),
        __v: 0
      },
      channels: {},
      rights: {},
      setupPersona: {},
      notifications: {}
    };

    mockedInquirer.prompt
      .mockResolvedValueOnce({
        authMethod: 'apiKey'
      })
      .mockResolvedValueOnce({
        apiKey: 'test-api-key'
      });

    mockedCheckApiKey.mockResolvedValue(mockUserData);
    mockedSaveApiKey.mockResolvedValue(undefined);

    await configureCommand();

    expect(mockedInquirer.prompt).toHaveBeenCalledTimes(2);
    expect(mockedCheckApiKey).toHaveBeenCalledWith('test-api-key');
    expect(mockedSaveApiKey).toHaveBeenCalledWith('test-api-key');
  });

  test('should configure with email method successfully', async () => {
    mockedInquirer.prompt
      .mockResolvedValueOnce({
        authMethod: 'email'
      })
      .mockResolvedValueOnce({
        email: 'test@example.com'
      })
      .mockResolvedValueOnce({
        pin: '123456'
      });

    mockedRequestEmailOTP.mockResolvedValue(true);
    mockedVerifyOTPAndGetToken.mockResolvedValue('test-token');
    mockedGenerateApiKey.mockResolvedValue('generated-api-key');
    mockedSaveApiKey.mockResolvedValue(undefined);

    await configureCommand();

    expect(mockedInquirer.prompt).toHaveBeenCalledTimes(3);
    expect(mockedRequestEmailOTP).toHaveBeenCalledWith('test@example.com');
    expect(mockedVerifyOTPAndGetToken).toHaveBeenCalledWith('test@example.com', '123456');
    expect(mockedGenerateApiKey).toHaveBeenCalledWith('test-token');
    expect(mockedSaveApiKey).toHaveBeenCalledWith('generated-api-key');
  });

  test('should handle invalid API key', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedInquirer.prompt
      .mockResolvedValueOnce({
        authMethod: 'apiKey'
      })
      .mockResolvedValueOnce({
        apiKey: 'invalid-api-key'
      });

    mockedCheckApiKey.mockImplementation(() => {
      console.error('❌ Invalid API key');
      process.exit(1);
    });

    await configureCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Invalid API key');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle OTP request failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedInquirer.prompt
      .mockResolvedValueOnce({
        authMethod: 'email'
      })
      .mockResolvedValueOnce({
        email: 'test@example.com'
      });

    mockedRequestEmailOTP.mockResolvedValue(false);

    await configureCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Failed to send OTP. Please try again.');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle invalid OTP', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedInquirer.prompt
      .mockResolvedValueOnce({
        authMethod: 'email'
      })
      .mockResolvedValueOnce({
        email: 'test@example.com'
      })
      .mockResolvedValueOnce({
        pin: 'invalid-pin'
      });

    mockedRequestEmailOTP.mockResolvedValue(true);
    mockedVerifyOTPAndGetToken.mockResolvedValue(null);

    await configureCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Invalid OTP. Please try again.');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle API key generation failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedInquirer.prompt
      .mockResolvedValueOnce({
        authMethod: 'email'
      })
      .mockResolvedValueOnce({
        email: 'test@example.com'
      })
      .mockResolvedValueOnce({
        pin: '123456'
      });

    mockedRequestEmailOTP.mockResolvedValue(true);
    mockedVerifyOTPAndGetToken.mockResolvedValue('test-token');
    mockedGenerateApiKey.mockResolvedValue(null);

    await configureCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Failed to generate API key. Please try again.');
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should handle API key save failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const processSpy = jest.spyOn(process, 'exit').mockImplementation();

    mockedInquirer.prompt
      .mockResolvedValueOnce({
        authMethod: 'apiKey'
      })
      .mockResolvedValueOnce({
        apiKey: 'test-api-key'
      });

    mockedCheckApiKey.mockResolvedValue({
      uid: 'user-123',
      email: 'test@example.com',
      emailVerified: true,
      fullName: 'Test User',
      mobileNumbers: [],
      emailAddresses: [{ address: 'test@example.com', validated: true, validatedAt: Date.now(), _id: 'email-1' }],
      country: { code: 'US', name: 'United States' },
      admin: {
        userId: 'user-123',
        orgs: [],
        id: 'admin-123',
        createdAt: Date.now(),
        __v: 0
      },
      channels: {},
      rights: {},
      setupPersona: {},
      notifications: {}
    });
    mockedSaveApiKey.mockRejectedValue(new Error('Save failed'));

    await configureCommand();

    expect(consoleSpy).toHaveBeenCalledWith('❌ Failed to save API key:', expect.any(Error));
    expect(processSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    processSpy.mockRestore();
  });

  test('should show success message after successful configuration', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const mockUserData = {
      uid: 'user-123',
      email: 'test@example.com',
      emailVerified: true,
      fullName: 'Test User',
      mobileNumbers: [],
      emailAddresses: [{ address: 'test@example.com', validated: true, validatedAt: Date.now(), _id: 'email-1' }],
      country: { code: 'US', name: 'United States' },
      admin: {
        userId: 'user-123',
        orgs: [],
        id: 'admin-123',
        createdAt: Date.now(),
        __v: 0
      },
      channels: {},
      rights: {},
      setupPersona: {},
      notifications: {}
    };

    mockedInquirer.prompt
      .mockResolvedValueOnce({
        authMethod: 'apiKey'
      })
      .mockResolvedValueOnce({
        apiKey: 'test-api-key'
      });

    mockedCheckApiKey.mockResolvedValue(mockUserData);
    mockedSaveApiKey.mockResolvedValue(undefined);

    await configureCommand();

    expect(consoleSpy).toHaveBeenCalledWith('✅ Configuration completed successfully!');
    expect(consoleSpy).toHaveBeenCalledWith(`👤 Logged in as: ${mockUserData.email}`);

    consoleSpy.mockRestore();
  });
});
