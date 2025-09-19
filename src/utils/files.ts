import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function copyTemplateFiles(templateDir: string, targetDir: string): void {
  const files = fs.readdirSync(templateDir);
  
  for (const file of files) {
    // Skip node_modules and package-lock.json to avoid circular dependencies
    if (file === 'node_modules' || file === 'package-lock.json') {
      continue;
    }
    
    const srcPath = path.join(templateDir, file);
    const destPath = path.join(targetDir, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyTemplateFiles(srcPath, destPath);
    } else if (file === 'package.json') {
      // Special handling for package.json to update lua-cli version
      updatePackageJson(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function updatePackageJson(srcPath: string, destPath: string): void {
  // Read the template package.json
  const templatePackageJson = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  
  // Get the current CLI version from the main package.json
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const mainPackageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  const mainPackageJson = JSON.parse(fs.readFileSync(mainPackageJsonPath, 'utf8'));
  const currentCliVersion = mainPackageJson.version;
  
  // Update the lua-cli dependency version
  if (templatePackageJson.dependencies && templatePackageJson.dependencies['lua-cli']) {
    templatePackageJson.dependencies['lua-cli'] = `^${currentCliVersion}`;
  }
  
  // Write the updated package.json
  fs.writeFileSync(destPath, JSON.stringify(templatePackageJson, null, 2) + '\n');
}

export function createSkillToml(agentId: string, orgId: string, skillName: string, skillDescription: string): void {
  const tomlContent = `[agent]
agentId = "${agentId}"
orgId = "${orgId}"

[skill]
name = "${skillName}"
description = "${skillDescription}"
`;
  
  fs.writeFileSync("lua.skill.toml", tomlContent);
}
