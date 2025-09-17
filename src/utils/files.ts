import fs from "fs";
import path from "path";

export function copyTemplateFiles(templateDir: string, targetDir: string): void {
  const files = fs.readdirSync(templateDir);
  
  for (const file of files) {
    const srcPath = path.join(templateDir, file);
    const destPath = path.join(targetDir, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyTemplateFiles(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
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
