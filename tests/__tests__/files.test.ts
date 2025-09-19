import fs from 'fs';
import path from 'path';
import { copyTemplateFiles, createSkillToml } from '../../src/utils/files.js';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Files Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('copyTemplateFiles', () => {
    test('should copy template files excluding node_modules and package-lock.json', () => {
      const templateDir = '/template';
      const targetDir = '/target';
      
      // Mock readdirSync to return various file types
      mockedFs.readdirSync.mockReturnValue([
        'index.ts',
        'package.json',
        'node_modules',
        'package-lock.json',
        'src'
      ] as any);

      // Mock statSync to identify directories
      mockedFs.statSync.mockImplementation((filePath: any) => {
        if (filePath.includes('src')) {
          return { isDirectory: () => true } as any;
        }
        return { isDirectory: () => false } as any;
      });

      // Mock readFileSync for package.json
      mockedFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify({
            dependencies: { 'lua-cli': '^1.0.0' }
          });
        }
        return '';
      });

      copyTemplateFiles(templateDir, targetDir);

      // Should not copy node_modules or package-lock.json
      expect(mockedFs.copyFileSync).not.toHaveBeenCalledWith(
        path.join(templateDir, 'node_modules'),
        path.join(targetDir, 'node_modules')
      );
      expect(mockedFs.copyFileSync).not.toHaveBeenCalledWith(
        path.join(templateDir, 'package-lock.json'),
        path.join(targetDir, 'package-lock.json')
      );

      // Should copy other files
      expect(mockedFs.copyFileSync).toHaveBeenCalledWith(
        path.join(templateDir, 'index.ts'),
        path.join(targetDir, 'index.ts')
      );
    });

    test('should handle package.json with version update', () => {
      const templateDir = '/template';
      const targetDir = '/target';
      
      mockedFs.readdirSync.mockReturnValue(['package.json'] as any);
      mockedFs.statSync.mockReturnValue({ isDirectory: () => false } as any);
      
      // Mock package.json content
      mockedFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('template/package.json')) {
          return JSON.stringify({
            dependencies: { 'lua-cli': '^1.0.0' }
          });
        }
        if (filePath.includes('../../package.json')) {
          return JSON.stringify({ version: '1.2.0' });
        }
        return '';
      });

      copyTemplateFiles(templateDir, targetDir);

      // Should write updated package.json with new version
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        path.join(targetDir, 'package.json'),
        expect.stringContaining('"lua-cli": "^1.2.0"')
      );
    });

    test('should recursively copy directories', () => {
      const templateDir = '/template';
      const targetDir = '/target';
      
      mockedFs.readdirSync.mockReturnValue(['src'] as any);
      mockedFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

      copyTemplateFiles(templateDir, targetDir);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        path.join(targetDir, 'src'),
        { recursive: true }
      );
    });
  });

  describe('createSkillToml', () => {
    test('should create skill TOML file with correct content', () => {
      const agentId = 'agent-123';
      const orgId = 'org-456';
      const skillName = 'test-skill';
      const skillDescription = 'A test skill';

      createSkillToml(agentId, orgId, skillName, skillDescription);

      const expectedContent = `[agent]
agentId = "agent-123"
orgId = "org-456"

[skill]
name = "test-skill"
description = "A test skill"
`;

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        'lua.skill.toml',
        expectedContent
      );
    });

    test('should handle special characters in skill name and description', () => {
      const agentId = 'agent-123';
      const orgId = 'org-456';
      const skillName = 'skill with "quotes" and \'apostrophes\'';
      const skillDescription = 'Description with "quotes" and \'apostrophes\'';

      createSkillToml(agentId, orgId, skillName, skillDescription);

      const expectedContent = `[agent]
agentId = "agent-123"
orgId = "org-456"

[skill]
name = "skill with "quotes" and 'apostrophes'"
description = "Description with "quotes" and 'apostrophes'"
`;

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        'lua.skill.toml',
        expectedContent
      );
    });
  });
});
