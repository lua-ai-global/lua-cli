import { 
  saveApiKey, 
  loadApiKey, 
  deleteApiKey, 
  checkApiKey, 
  requestEmailOTP, 
  verifyOTPAndGetToken, 
  generateApiKey 
} from '../../src/services/auth.js';
import keytar from 'keytar';
import fetch from 'node-fetch';

// Mock dependencies
jest.mock('keytar');
jest.mock('node-fetch');

const mockedKeytar = keytar as jest.Mocked<typeof keytar>;
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Key Management', () => {
    test('should save API key', async () => {
      mockedKeytar.setPassword.mockResolvedValue(undefined);
      
      await saveApiKey('test-api-key');
      
      expect(mockedKeytar.setPassword).toHaveBeenCalledWith('lua-cli', 'api-key', 'test-api-key');
    });

    test('should load API key', async () => {
      mockedKeytar.getPassword.mockResolvedValue('test-api-key');
      
      const result = await loadApiKey();
      
      expect(result).toBe('test-api-key');
      expect(mockedKeytar.getPassword).toHaveBeenCalledWith('lua-cli', 'api-key');
    });

    test('should return null when no API key exists', async () => {
      mockedKeytar.getPassword.mockResolvedValue(null);
      
      const result = await loadApiKey();
      
      expect(result).toBeNull();
    });

    test('should delete API key', async () => {
      mockedKeytar.deletePassword.mockResolvedValue(true);
      
      const result = await deleteApiKey();
      
      expect(result).toBe(true);
      expect(mockedKeytar.deletePassword).toHaveBeenCalledWith('lua-cli', 'api-key');
    });
  });

  describe('API Key Validation', () => {
    test('should validate API key successfully', async () => {
      const mockUserData = { id: '123', email: 'test@example.com' };
      mockedFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserData)
      } as any);

      const result = await checkApiKey('valid-api-key');

      expect(result).toEqual(mockUserData);
      expect(mockedFetch).toHaveBeenCalledWith('https://api.heylua.ai/admin', {
        headers: {
          Authorization: 'Bearer valid-api-key',
        },
      });
    });

    test('should handle invalid API key', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const processSpy = jest.spyOn(process, 'exit').mockImplementation();

      mockedFetch.mockResolvedValue({
        ok: false,
        status: 401
      } as any);

      await checkApiKey('invalid-api-key');

      expect(consoleSpy).toHaveBeenCalledWith('❌ Invalid API key');
      expect(processSpy).toHaveBeenCalledWith(1);

      consoleSpy.mockRestore();
      processSpy.mockRestore();
    });
  });

  describe('Email OTP Authentication', () => {
    test('should request OTP successfully', async () => {
      mockedFetch.mockResolvedValue({
        ok: true
      } as any);

      const result = await requestEmailOTP('test@example.com');

      expect(result).toBe(true);
      expect(mockedFetch).toHaveBeenCalledWith('https://auth.heylua.ai/otp', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'email',
          email: 'test@example.com'
        })
      });
    });

    test('should handle OTP request failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockedFetch.mockRejectedValue(new Error('Network error'));

      const result = await requestEmailOTP('test@example.com');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error requesting OTP:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    test('should verify OTP and get token successfully', async () => {
      const mockResponse = { signInToken: 'test-token' };
      mockedFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const result = await verifyOTPAndGetToken('test@example.com', '123456');

      expect(result).toBe('test-token');
      expect(mockedFetch).toHaveBeenCalledWith('https://auth.heylua.ai/otp/verify', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pin: '123456',
          type: 'email',
          email: 'test@example.com'
        })
      });
    });

    test('should return null for invalid OTP', async () => {
      mockedFetch.mockResolvedValue({
        ok: false
      } as any);

      const result = await verifyOTPAndGetToken('test@example.com', 'invalid');

      expect(result).toBeNull();
    });

    test('should handle OTP verification error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockedFetch.mockRejectedValue(new Error('Network error'));

      const result = await verifyOTPAndGetToken('test@example.com', '123456');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error verifying OTP:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    test('should generate API key successfully', async () => {
      const mockResponse = { apiKey: 'generated-api-key' };
      mockedFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const result = await generateApiKey('test-token');

      expect(result).toBe('generated-api-key');
      expect(mockedFetch).toHaveBeenCalledWith('https://auth.heylua.ai/profile/apiKey', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        body: ''
      });
    });

    test('should return null for API key generation failure', async () => {
      mockedFetch.mockResolvedValue({
        ok: false
      } as any);

      const result = await generateApiKey('invalid-token');

      expect(result).toBeNull();
    });

    test('should handle API key generation error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockedFetch.mockRejectedValue(new Error('Network error'));

      const result = await generateApiKey('test-token');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error generating API key:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});
