import fs from "fs";
import path from "path";

export async function deployCommand() {
  try {
    console.log("🔨 Compiling Lua skill...");
    
    // Read package.json to get version and name
    const packageJsonPath = path.join(process.cwd(), "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error("package.json not found in current directory");
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const version = packageJson.version || "1.0.0";
    const skillsName = packageJson.name || "lua-skill";
    
    // Read index.ts file
    const indexPath = path.join(process.cwd(), "index.ts");
    if (!fs.existsSync(indexPath)) {
      throw new Error("index.ts not found in current directory");
    }
    
    const indexContent = fs.readFileSync(indexPath, "utf8");
    
    // Extract skill information
    const skillInfo = await extractSkillInfo(indexContent);
    
    // Create deployment data
    const deployData = {
      version,
      skillsName,
      tools: skillInfo
    };
    
    // Create .lua directory
    const luaDir = path.join(process.cwd(), ".lua");
    if (!fs.existsSync(luaDir)) {
      fs.mkdirSync(luaDir, { recursive: true });
    }
    
    // Write JSON output to .lua directory
    const jsonOutputPath = path.join(luaDir, "deploy.json");
    fs.writeFileSync(jsonOutputPath, JSON.stringify(deployData, null, 2));
    
    // Write individual tool files to .lua directory
    for (const tool of skillInfo) {
      const toolFilePath = path.join(luaDir, `${tool.name}.js`);
      fs.writeFileSync(toolFilePath, tool.execute);
    }
    
    console.log(`📁 Compiled files written to: ${luaDir}`);
    console.log(`📄 JSON output: ${jsonOutputPath}`);
    console.log(`🔧 Tool files: ${skillInfo.map(t => `${t.name}.js`).join(', ')}`);
    console.log("✅ Skill compilation completed successfully!");
    
  } catch (error: any) {
    console.error("❌ Compilation failed:", error.message);
    process.exit(1);
  }
}

async function extractSkillInfo(indexContent: string) {
  const tools: any[] = [];
  
  // Find inline addTool calls: skill.addTool({...})
  const inlineAddToolRegex = /skill\.addTool\(\s*\{([\s\S]*?)\}\s*\)/g;
  let match;
  
  while ((match = inlineAddToolRegex.exec(indexContent)) !== null) {
    const toolContent = match[1];
    
    // Extract tool properties
    const nameMatch = toolContent.match(/name:\s*["']([^"']+)["']/);
    const descriptionMatch = toolContent.match(/description:\s*["']([^"']+)["']/);
    const inputSchemaMatch = toolContent.match(/inputSchema:\s*(\w+)/);
    const outputSchemaMatch = toolContent.match(/outputSchema:\s*(\w+)/);
    const executeMatch = toolContent.match(/execute:\s*async\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\}/);
    
    if (nameMatch && descriptionMatch && inputSchemaMatch && outputSchemaMatch && executeMatch) {
      const toolName = nameMatch[1];
      const toolDescription = descriptionMatch[1];
      const inputSchemaVar = inputSchemaMatch[1];
      const outputSchemaVar = outputSchemaMatch[1];
      const executeBody = executeMatch[1];
      
      // Convert schemas to JSON Schema format
      const inputSchema = convertSchemaToJSON(inputSchemaVar, indexContent);
      const outputSchema = convertSchemaToJSON(outputSchemaVar, indexContent);
      
      // Create self-contained execute function
      const selfContainedExecute = await createSelfContainedExecute(executeBody, indexContent);
      
      tools.push({
        name: toolName,
        description: toolDescription,
        inputSchema,
        outputSchema,
        execute: selfContainedExecute
      });
    }
  }
  
  // Find class-based addTool calls: skill.addTool(new SomeTool())
  const classAddToolRegex = /skill\.addTool\(\s*new\s+(\w+)\(\)\s*\)/g;
  let classMatch;
  
  while ((classMatch = classAddToolRegex.exec(indexContent)) !== null) {
    const className = classMatch[1];
    
    // Find the tool class definition
    const toolInfo = await extractToolFromClass(className, indexContent);
    if (toolInfo) {
      tools.push(toolInfo);
    }
  }
  
  return tools;
}

function convertSchemaToJSON(schemaVar: string, indexContent: string): any {
  // Find the schema definition
  const schemaRegex = new RegExp(`const\\s+${schemaVar}\\s*=\\s*z\\.object\\(\\{([\\s\\S]*?)\\}\\\);`, 'g');
  const match = schemaRegex.exec(indexContent);
  
  if (match) {
    const schemaContent = match[1];
    // Convert Zod schema to JSON Schema format
    return {
      type: "object",
      properties: parseZodProperties(schemaContent),
      required: extractRequiredFields(schemaContent)
    };
  }
  
  // If no match found, return empty schema
  return { type: "object", properties: {} };
}

function parseZodProperties(schemaContent: string): any {
  const properties: any = {};
  
  // Simple regex to find z.string(), z.number(), etc.
  const fieldRegex = /(\w+):\s*z\.(\w+)\(\)/g;
  let match;
  
  while ((match = fieldRegex.exec(schemaContent)) !== null) {
    const fieldName = match[1];
    const fieldType = match[2];
    
    switch (fieldType) {
      case 'string':
        properties[fieldName] = { type: 'string' };
        break;
      case 'number':
        properties[fieldName] = { type: 'number' };
        break;
      case 'boolean':
        properties[fieldName] = { type: 'boolean' };
        break;
      default:
        properties[fieldName] = { type: 'string' };
    }
  }
  
  return properties;
}

function extractRequiredFields(schemaContent: string): string[] {
  const required: string[] = [];
  const fieldRegex = /(\w+):\s*z\.(\w+)\(\)/g;
  let match;
  
  while ((match = fieldRegex.exec(schemaContent)) !== null) {
    required.push(match[1]);
  }
  
  return required;
}

async function createSelfContainedExecute(executeBody: string, indexContent: string): Promise<string> {
  const dependencies: string[] = [];
  const bundledPackages: Set<string> = new Set();
  
  // 1. Parse external package imports and bundle their code
  const allImportRegex = /import\s+(?:(?:\{([^}]+)\})|(\w+))\s+from\s+["']([^"']+)["']/g;
  let importMatch;
  while ((importMatch = allImportRegex.exec(indexContent)) !== null) {
    const namedImports = importMatch[1]; // Named imports like { z }
    const defaultImport = importMatch[2]; // Default import like axios
    const packagePath = importMatch[3];
    
    // Skip local imports (relative paths)
    if (packagePath.startsWith('./') || packagePath.startsWith('../')) {
      continue;
    }
    
    // Skip lua-cli imports (these are handled separately)
    if (packagePath.startsWith('lua-cli')) {
      continue;
    }
    
    // Skip zod - assume it's always available on target machine
    if (packagePath === 'zod') {
      // Add require statement for zod instead of bundling
      if (namedImports) {
        const importsList = namedImports.split(',').map(imp => imp.trim());
        const usedImports = importsList.filter(imp => 
          executeBody.includes(imp) || indexContent.includes(`${imp}.`)
        );
        
        if (usedImports.length > 0) {
          const requireStatement = usedImports.length === 1 
            ? `const { ${usedImports[0]} } = require('zod');`
            : `const { ${usedImports.join(', ')} } = require('zod');`;
          bundledPackages.add(requireStatement);
        }
      } else if (defaultImport) {
        bundledPackages.add(`const ${defaultImport} = require('zod');`);
      }
      continue;
    }
    
    // Bundle other external packages
    if (namedImports || defaultImport) {
      const packageCode = await bundlePackageCode(packagePath, namedImports, defaultImport);
      if (packageCode) {
        bundledPackages.add(packageCode);
      }
    }
  }
  
  // 2. Extract class definitions with proper brace matching
  const classRegex = /class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{/g;
  let classMatch;
  while ((classMatch = classRegex.exec(indexContent)) !== null) {
    const className = classMatch[1];
    const classStart = classMatch.index;
    
    // Find the matching closing brace
    let braceCount = 0;
    let classEnd = classStart;
    let found = false;
    
    for (let i = classStart; i < indexContent.length; i++) {
      if (indexContent[i] === '{') {
        braceCount++;
      } else if (indexContent[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          classEnd = i;
          found = true;
          break;
        }
      }
    }
    
    if (found) {
      const fullClass = indexContent.substring(classStart, classEnd + 1);
      
      // Check if this class is used in the execute function
      let isUsed = false;
      
      // Direct usage in execute body
      if (executeBody.includes(`new ${className}`) || 
          executeBody.includes(`${className}.`) ||
          executeBody.includes(`${className}(`)) {
        isUsed = true;
      }
      
      // Check if any variable that uses this class is referenced in execute body
      const variableRegex = new RegExp(`(?:const|let|var)\\s+(\\w+)\\s*=\\s*new\\s+${className}\\s*\\([^)]*\\);`, 'g');
      let varMatch;
      while ((varMatch = variableRegex.exec(indexContent)) !== null) {
        const varName = varMatch[1];
        if (executeBody.includes(varName)) {
          isUsed = true;
          break;
        }
      }
      
      if (isUsed) {
        dependencies.push(fullClass);
      }
    }
  }
  
  // 3. Extract function definitions
  const functionRegex = /(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/g;
  let functionMatch;
  while ((functionMatch = functionRegex.exec(indexContent)) !== null) {
    const functionName = functionMatch[1];
    const functionBody = functionMatch[2];
    
    if (executeBody.includes(functionName)) {
      dependencies.push(`function ${functionName}() {\n${functionBody}\n}`);
    }
  }
  
  // 4. Extract const/let/var declarations (avoid duplicates)
  const varRegex = /(?:const|let|var)\s+(\w+)\s*=\s*([^;]+);/g;
  const declaredVars = new Set<string>();
  let varMatch;
  while ((varMatch = varRegex.exec(indexContent)) !== null) {
    const varName = varMatch[1];
    const varValue = varMatch[2];
    
    // Skip if it's a class instantiation (we'll handle that separately)
    if (varValue.includes('new ') && varValue.includes('()')) {
      continue;
    }
    
    // Skip if already declared
    if (declaredVars.has(varName)) {
      continue;
    }
    
    if (executeBody.includes(varName)) {
      declaredVars.add(varName);
      dependencies.push(`const ${varName} = ${varValue};`);
    }
  }
  
  // 5. Extract class instantiations (avoid duplicates)
  const instantiationRegex = /(?:const|let|var)\s+(\w+)\s*=\s*new\s+(\w+)\([^)]*\);/g;
  let instantiationMatch;
  while ((instantiationMatch = instantiationRegex.exec(indexContent)) !== null) {
    const instanceName = instantiationMatch[1];
    const className = instantiationMatch[2];
    
    // Skip if already declared
    if (declaredVars.has(instanceName)) {
      continue;
    }
    
    if (executeBody.includes(instanceName)) {
      declaredVars.add(instanceName);
      dependencies.push(`const ${instanceName} = new ${className}();`);
    }
  }
  
  // 6. Create the self-contained execute function
  const allDependencies = [...Array.from(bundledPackages), ...dependencies];
  const dependencyCode = allDependencies.join('\n');
  
  // Strip TypeScript type annotations for JavaScript compatibility (only for local code)
  const cleanDependencyCode = allDependencies.map(dep => {
    // Only strip TypeScript from local dependencies, not bundled packages
    if (dep.includes('require(') || dep.includes('import ')) {
      return dep; // Skip bundled packages
    }
    return dep
      .replace(/:\s*string/g, '') // Remove : string
      .replace(/:\s*number/g, '') // Remove : number
      .replace(/:\s*boolean/g, '') // Remove : boolean
      .replace(/:\s*any/g, '') // Remove : any
      .replace(/:\s*void/g, '') // Remove : void
      .replace(/:\s*object/g, '') // Remove : object
      .replace(/:\s*Array<[^>]+>/g, '') // Remove : Array<Type>
      .replace(/:\s*Promise<[^>]+>/g, '') // Remove : Promise<Type>
      .replace(/:\s*Record<[^>]+>/g, ''); // Remove : Record<Type>
  }).join('\n');
  
  const cleanExecuteBody = executeBody
    .replace(/:\s*string/g, '') // Remove : string
    .replace(/:\s*number/g, '') // Remove : number
    .replace(/:\s*boolean/g, '') // Remove : boolean
    .replace(/:\s*any/g, '') // Remove : any
    .replace(/:\s*void/g, '') // Remove : void
    .replace(/:\s*object/g, '') // Remove : object
    .replace(/:\s*Array<[^>]+>/g, '') // Remove : Array<Type>
    .replace(/:\s*Promise<[^>]+>/g, '') // Remove : Promise<Type>
    .replace(/:\s*Record<[^>]+>/g, ''); // Remove : Record<Type>
  
  const selfContainedExecute = `async (input) => {
${cleanDependencyCode ? `  ${cleanDependencyCode.split('\n').join('\n  ')}\n` : ''}  ${cleanExecuteBody.trim()}
}`;
  
  return selfContainedExecute;
}

async function bundlePackageCode(packagePath: string, namedImports?: string, defaultImport?: string): Promise<string | null> {
  try {
    const { build } = await import('esbuild');
    
    // Create a temporary entry file for esbuild in .lua directory
    const luaDir = path.join(process.cwd(), '.lua');
    if (!fs.existsSync(luaDir)) {
      fs.mkdirSync(luaDir, { recursive: true });
    }
    
    const entryFile = path.join(luaDir, `${packagePath}-entry.js`);
    const outputFile = path.join(luaDir, `${packagePath}-bundle.js`);
    
    // Create entry file based on import type
    let entryContent = '';
    if (defaultImport) {
      // For default imports like `import axios from 'axios'`
      entryContent = `import ${defaultImport} from '${packagePath}';\nmodule.exports = ${defaultImport};`;
    } else if (namedImports) {
      // For named imports like `import { z } from 'zod'`
      const importsList = namedImports.split(',').map(imp => imp.trim());
      entryContent = `import { ${importsList.join(', ')} } from '${packagePath}';\nmodule.exports = { ${importsList.join(', ')} };`;
    } else {
      // Fallback - import everything
      entryContent = `import * as ${packagePath.replace(/[^a-zA-Z0-9]/g, '_')} from '${packagePath}';\nmodule.exports = ${packagePath.replace(/[^a-zA-Z0-9]/g, '_')};`;
    }
    
    // Write entry file
    fs.writeFileSync(entryFile, entryContent);
    
    // Bundle with esbuild
    const result = await build({
      entryPoints: [entryFile],
      bundle: true,
      format: 'cjs', // CommonJS format
      platform: 'node',
      target: 'node16',
      outfile: outputFile,
      external: [], // Bundle everything
      minify: false, // Keep readable for debugging
      sourcemap: false,
      write: true,
      resolveExtensions: ['.js', '.ts', '.json'],
      mainFields: ['main', 'module', 'browser'],
      conditions: ['node'],
      nodePaths: [
        path.join(process.cwd(), 'node_modules'),
        path.join(process.cwd(), '..', 'node_modules'),
        path.join(process.cwd(), '..', '..', 'node_modules')
      ],
      absWorkingDir: process.cwd(),
    });
    
    if (result.errors.length > 0) {
      console.warn(`Warning: esbuild errors for package ${packagePath}:`, result.errors);
      return null;
    }
    
    // Read the bundled output
    if (!fs.existsSync(outputFile)) {
      console.warn(`Warning: Bundle output not found for package ${packagePath}`);
      return null;
    }
    
    const bundledContent = fs.readFileSync(outputFile, 'utf8');
    
    // Clean up temporary files
    try {
      fs.unlinkSync(entryFile);
      fs.unlinkSync(outputFile);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    // Create the final bundled code
    let finalCode = '';
    if (defaultImport) {
      finalCode = `const ${defaultImport} = (function() {\n${bundledContent}\n  return module.exports;\n})();\n`;
    } else if (namedImports) {
      const importsList = namedImports.split(',').map(imp => imp.trim());
      finalCode = `(function() {\n${bundledContent}\n})();\n`;
      finalCode += `const { ${importsList.join(', ')} } = module.exports;\n`;
    } else {
      finalCode = `(function() {\n${bundledContent}\n})();\n`;
    }
    
    return finalCode;
    
  } catch (error) {
    console.warn(`Warning: Could not bundle package ${packagePath} with esbuild:`, error);
    
    // For test environments or when esbuild fails, provide a fallback
    if (packagePath === 'axios') {
      return createWorkingAxiosImplementation();
    }
    
    return null;
  }
}

function createWorkingAxiosImplementation(): string {
  return `
// Working axios implementation using native fetch (for test environments)
const axios = {
  get: async (url, config = {}) => {
    const searchParams = new URLSearchParams(config.params || {});
    const fullUrl = searchParams.toString() ? \`\${url}?\${searchParams}\` : url;
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });
    
    if (!response.ok) {
      const error = new Error(\`Request failed with status \${response.status}\`);
      error.response = { status: response.status, statusText: response.statusText };
      throw error;
    }
    
    const data = await response.json();
    return { 
      data, 
      status: response.status, 
      statusText: response.statusText,
      headers: response.headers,
      config: config
    };
  },
  
  post: async (url, data, config = {}) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = new Error(\`Request failed with status \${response.status}\`);
      error.response = { status: response.status, statusText: response.statusText };
      throw error;
    }
    
    const responseData = await response.json();
    return { 
      data: responseData, 
      status: response.status, 
      statusText: response.statusText,
      headers: response.headers,
      config: config
    };
  },
  
  put: async (url, data, config = {}) => {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = new Error(\`Request failed with status \${response.status}\`);
      error.response = { status: response.status, statusText: response.statusText };
      throw error;
    }
    
    const responseData = await response.json();
    return { 
      data: responseData, 
      status: response.status, 
      statusText: response.statusText,
      headers: response.headers,
      config: config
    };
  },
  
  delete: async (url, config = {}) => {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });
    
    if (!response.ok) {
      const error = new Error(\`Request failed with status \${response.status}\`);
      error.response = { status: response.status, statusText: response.statusText };
      throw error;
    }
    
    const responseData = await response.json();
    return { 
      data: responseData, 
      status: response.status, 
      statusText: response.statusText,
      headers: response.headers,
      config: config
    };
  },
  
  patch: async (url, data, config = {}) => {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = new Error(\`Request failed with status \${response.status}\`);
      error.response = { status: response.status, statusText: response.statusText };
      throw error;
    }
    
    const responseData = await response.json();
    return { 
      data: responseData, 
      status: response.status, 
      statusText: response.statusText,
      headers: response.headers,
      config: config
    };
  }
};
`;
}

async function extractToolFromClass(className: string, indexContent: string): Promise<any> {
  // Find the import statement for this class
  const importRegex = new RegExp(`import\\s+${className}\\s+from\\s+["']([^"']+)["']`, 'g');
  const importMatch = importRegex.exec(indexContent);
  
  if (!importMatch) {
    console.warn(`Warning: Could not find import for class ${className}`);
    return null;
  }
  
  const importPath = importMatch[1];
  
  // Read the tool file
  const toolFilePath = path.join(process.cwd(), importPath.replace('./', '') + '.ts');
  if (!fs.existsSync(toolFilePath)) {
    console.warn(`Warning: Tool file not found: ${toolFilePath}`);
    return null;
  }
  
  const toolContent = fs.readFileSync(toolFilePath, 'utf8');
  
  // Extract tool properties from the class
  const nameMatch = toolContent.match(/this\.name\s*=\s*["']([^"']+)["']/);
  const descriptionMatch = toolContent.match(/this\.description\s*=\s*["']([^"']+)["']/);
  
  if (!nameMatch || !descriptionMatch) {
    console.warn(`Warning: Could not extract name or description from ${className}`);
    return null;
  }
  
  const toolName = nameMatch[1];
  const toolDescription = descriptionMatch[1];
  
  // Extract schemas
  const inputSchemaMatch = toolContent.match(/const\s+(\w+)\s*=\s*z\.object\(/);
  const outputSchemaMatch = toolContent.match(/const\s+(\w+)\s*=\s*z\.object\(/);
  
  if (!inputSchemaMatch) {
    console.warn(`Warning: Could not find input schema in ${className}`);
    return null;
  }
  
  // Convert schemas to JSON Schema format
  const inputSchema = convertSchemaToJSON(inputSchemaMatch[1], toolContent);
  const outputSchema = outputSchemaMatch ? convertSchemaToJSON(outputSchemaMatch[1], toolContent) : { type: "object" };
  
  // Extract execute method
  const executeMatch = toolContent.match(/async\s+execute\s*\([^)]*\)\s*\{([\s\S]*?)\}/);
  if (!executeMatch) {
    console.warn(`Warning: Could not find execute method in ${className}`);
    return null;
  }
  
  const executeBody = executeMatch[1];
  
  // For class-based tools, we need to create a self-contained function that includes:
  // 1. The service classes
  // 2. Class instantiation
  // 3. The execute logic
  const selfContainedExecute = await createClassBasedExecute(executeBody, toolContent, className);
  
  return {
    name: toolName,
    description: toolDescription,
    inputSchema,
    outputSchema,
    execute: selfContainedExecute
  };
}

async function createClassBasedExecute(executeBody: string, toolContent: string, className: string): Promise<string> {
  const dependencies: string[] = [];
  const bundledPackages: Set<string> = new Set();
  
  // 1. Parse imports from the tool file
  const importRegex = /import\s+(?:(?:\{([^}]+)\})|(\w+))\s+from\s+["']([^"']+)["']/g;
  let importMatch;
  
  while ((importMatch = importRegex.exec(toolContent)) !== null) {
    const namedImports = importMatch[1];
    const defaultImport = importMatch[2];
    const packagePath = importMatch[3];
    
    // Skip lua-cli imports
    if (packagePath.startsWith('lua-cli')) {
      continue;
    }
    
    // Handle zod
    if (packagePath === 'zod') {
      if (namedImports) {
        const importsList = namedImports.split(',').map(imp => imp.trim());
        const usedImports = importsList.filter(imp => 
          executeBody.includes(imp) || toolContent.includes(`${imp}.`)
        );
        
        if (usedImports.length > 0) {
          const requireStatement = usedImports.length === 1 
            ? `const { ${usedImports[0]} } = require('zod');`
            : `const { ${usedImports.join(', ')} } = require('zod');`;
          bundledPackages.add(requireStatement);
        }
      } else if (defaultImport) {
        bundledPackages.add(`const ${defaultImport} = require('zod');`);
      }
      continue;
    }
    
    // Handle axios
    if (packagePath === 'axios') {
      bundledPackages.add(`const axios = require('axios');`);
      continue;
    }
    
    // Handle local service imports
    if (packagePath.startsWith('./') || packagePath.startsWith('../')) {
      // The tool files are in tools/ subdirectory, so we need to resolve from there
      const toolDir = path.join(process.cwd(), 'tools');
      const serviceFilePath = path.resolve(toolDir, packagePath + '.ts');
      if (fs.existsSync(serviceFilePath)) {
        const serviceContent = fs.readFileSync(serviceFilePath, 'utf8');
        
        // Check for axios import in service file
        if (serviceContent.includes("import axios from \"axios\"")) {
          bundledPackages.add(`const axios = require('axios');`);
        }
        
        // Extract the service class with proper brace matching
        const classRegex = /class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{/g;
        let classMatch = classRegex.exec(serviceContent);
        
        if (classMatch) {
          const serviceClassName = classMatch[1];
          const startIndex = classMatch.index + classMatch[0].length - 1; // Position of opening brace
          
          // Find matching closing brace
          let braceCount = 1;
          let endIndex = startIndex + 1;
          
          while (endIndex < serviceContent.length && braceCount > 0) {
            if (serviceContent[endIndex] === '{') braceCount++;
            else if (serviceContent[endIndex] === '}') braceCount--;
            endIndex++;
          }
          
          if (braceCount === 0) {
            const serviceClassBody = serviceContent.substring(startIndex + 1, endIndex - 1);
            
            // Clean up the class body (remove TypeScript types)
            const cleanClassBody = serviceClassBody
              .replace(/:\s*string/g, '')
              .replace(/:\s*number/g, '')
              .replace(/:\s*boolean/g, '')
              .replace(/:\s*any/g, '')
              .replace(/:\s*void/g, '')
              .replace(/:\s*Promise<[^>]+>/g, '')
              .replace(/:\s*Record<[^>]+>/g, '');
            
            // Create the service class
            const serviceClass = `class ${serviceClassName} {\n${cleanClassBody}\n}`;
            dependencies.push(serviceClass);
          }
        }
      }
      continue;
    }
    
    // Bundle other external packages
    if (namedImports || defaultImport) {
      const packageCode = await bundlePackageCode(packagePath, namedImports, defaultImport);
      if (packageCode) {
        bundledPackages.add(packageCode);
      }
    }
  }
  
  // 2. Extract class instantiation from constructor
  const constructorMatch = toolContent.match(/constructor\s*\([^)]*\)\s*\{([\s\S]*?)\}/);
  if (constructorMatch) {
    const constructorBody = constructorMatch[1];
    
    // Extract service instantiation
    const serviceInstantiationMatch = constructorBody.match(/this\.(\w+)\s*=\s*new\s+(\w+)\([^)]*\);/);
    if (serviceInstantiationMatch) {
      const serviceProperty = serviceInstantiationMatch[1];
      const serviceClass = serviceInstantiationMatch[2];
      dependencies.push(`const ${serviceProperty} = new ${serviceClass}();`);
    }
  }
  
  // 3. Create the self-contained execute function
  const allDependencies = [...Array.from(bundledPackages), ...dependencies];
  const dependencyCode = allDependencies.join('\n');
  
  // Clean the execute body (remove TypeScript types)
  const cleanExecuteBody = executeBody
    .replace(/:\s*string/g, '')
    .replace(/:\s*number/g, '')
    .replace(/:\s*boolean/g, '')
    .replace(/:\s*any/g, '')
    .replace(/:\s*void/g, '')
    .replace(/:\s*Promise<[^>]+>/g, '')
    .replace(/:\s*Record<[^>]+>/g, '');
  
  // Replace this.serviceProperty with the instantiated service
  const finalExecuteBody = cleanExecuteBody.replace(/this\.(\w+)/g, '$1');
  
  return `async (input) => {
${dependencyCode ? dependencyCode + '\n' : ''}${finalExecuteBody}
}`;
}
