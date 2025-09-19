import { createSkillToml } from '../../src/utils/files';
import fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('file utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSkillToml', () => {
    it('should create lua.skill.toml file with correct content', () => {
      const agentId = 'agent-123';
      const orgId = 'org-456';
      const skillName = 'My Test Skill';
      const skillDescription = 'A test skill description';

      createSkillToml(agentId, orgId, skillName, skillDescription);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        'lua.skill.toml',
        `[agent]
agentId = "${agentId}"
orgId = "${orgId}"

[skill]
name = "${skillName}"
description = "${skillDescription}"
`
      );
    });

    it('should handle special characters in skill name and description', () => {
      const agentId = 'agent-123';
      const orgId = 'org-456';
      const skillName = 'Skill with "quotes" and \'apostrophes\'';
      const skillDescription = 'Description with "quotes" and \'apostrophes\'';

      createSkillToml(agentId, orgId, skillName, skillDescription);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        'lua.skill.toml',
        `[agent]
agentId = "${agentId}"
orgId = "${orgId}"

[skill]
name = "${skillName}"
description = "${skillDescription}"
`
      );
    });
  });
});