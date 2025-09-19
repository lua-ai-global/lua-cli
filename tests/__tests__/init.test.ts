import { initCommand } from '../../src/commands/init';
import { createSkillToml } from '../../src/utils/files';
import { loadApiKey, checkApiKey } from '../../src/services/auth';
import inquirer from 'inquirer';

// Mock dependencies
jest.mock('../../src/services/auth');
jest.mock('../../src/utils/files');
jest.mock('inquirer');

const mockedLoadApiKey = loadApiKey as jest.MockedFunction<typeof loadApiKey>;
const mockedCheckApiKey = checkApiKey as jest.MockedFunction<typeof checkApiKey>;
const mockedCreateSkillToml = createSkillToml as jest.MockedFunction<typeof createSkillToml>;
const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;

describe('initCommand', () => {
  const mockUserData = {
    admin: {
      orgs: [
        {
          id: 'org-1',
          registeredName: 'Test Organization',
          agents: [
            {
              agentId: 'agent-1',
              name: 'Test Agent',
            },
          ],
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    
    // Mock API key functions
    mockedLoadApiKey.mockResolvedValue('test-api-key');
    mockedCheckApiKey.mockResolvedValue(mockUserData as any);
    
    // Mock inquirer prompts
    mockedInquirer.prompt
      .mockResolvedValueOnce({ selectedOrg: mockUserData.admin.orgs[0] })
      .mockResolvedValueOnce({ selectedAgent: mockUserData.admin.orgs[0].agents[0] })
      .mockResolvedValueOnce({ 
        skillName: 'My Test Skill',
        skillDescription: 'A test skill description'
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize a skill project successfully', async () => {
    await initCommand();

    expect(mockedLoadApiKey).toHaveBeenCalled();
    expect(mockedCheckApiKey).toHaveBeenCalledWith('test-api-key');
    expect(mockedInquirer.prompt).toHaveBeenCalledTimes(3);
    expect(mockedCreateSkillToml).toHaveBeenCalledWith(
      'agent-1',
      'org-1',
      'My Test Skill',
      'A test skill description'
    );
    expect(console.log).toHaveBeenCalledWith('✅ Created lua.skill.toml');
    expect(console.log).toHaveBeenCalledWith('🎉 Lua skill project initialized successfully!');
    expect(console.log).toHaveBeenCalledWith('📦 Run `npm install` to install dependencies');
  });

  it('should exit with error when no API key is found', async () => {
    mockedLoadApiKey.mockResolvedValue(null);

    await initCommand();

    expect(console.error).toHaveBeenCalledWith('❌ No API key found. Run `lua configure` first.');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle organization selection', async () => {
    await initCommand();

    // Check that organization prompt was called with correct choices
    const orgPrompt = mockedInquirer.prompt.mock.calls[0][0];
    expect(orgPrompt).toEqual({
      type: 'list',
      name: 'selectedOrg',
      message: 'Select an organization:',
      choices: [
        {
          name: 'Test Organization',
          value: mockUserData.admin.orgs[0],
        },
      ],
    });
  });

  it('should handle agent selection', async () => {
    await initCommand();

    // Check that agent prompt was called with correct choices
    const agentPrompt = mockedInquirer.prompt.mock.calls[1][0];
    expect(agentPrompt).toEqual({
      type: 'list',
      name: 'selectedAgent',
      message: 'Select an agent:',
      choices: [
        {
          name: 'Test Agent',
          value: mockUserData.admin.orgs[0].agents[0],
        },
      ],
    });
  });

  it('should handle skill details input', async () => {
    await initCommand();

    // Check that skill details prompt was called
    const skillPrompt = mockedInquirer.prompt.mock.calls[2][0];
    expect(skillPrompt).toEqual({
      type: 'input',
      name: 'skillName',
      message: 'Enter a name for your skill:',
      default: 'My Lua Skill',
    });
  });

  it('should use default values for skill details', async () => {
    // Mock with default values
    mockedInquirer.prompt
      .mockResolvedValueOnce({ selectedOrg: mockUserData.admin.orgs[0] })
      .mockResolvedValueOnce({ selectedAgent: mockUserData.admin.orgs[0].agents[0] })
      .mockResolvedValueOnce({ 
        skillName: 'My Lua Skill', // Default value
        skillDescription: 'A Lua skill for automation' // Default value
      });

    await initCommand();

    expect(mockedCreateSkillToml).toHaveBeenCalledWith(
      'agent-1',
      'org-1',
      'My Lua Skill',
      'A Lua skill for automation'
    );
  });
});
