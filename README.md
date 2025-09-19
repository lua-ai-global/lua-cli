# Lua CLI

A powerful command-line interface for the Lua AI platform that helps you develop, test, and deploy LuaSkills with custom tools.

## Installation

```bash
npm install -g lua-cli
```

## Usage

After installation, you can use the `lua` command:

```bash
lua --help
```

## Features

- 🔐 **Secure Authentication**: Support for both API key and email-based OTP authentication
- 🏢 **Organization Management**: Select and manage multiple organizations
- 🤖 **Agent Management**: Choose from available agents within your organizations
- 🛠️ **Skill Development**: Initialize new Lua skills with proper configuration
- 🔧 **Tool Development**: Create custom tools with TypeScript and Zod validation
- 📦 **Dependency Bundling**: Automatic bundling of npm packages using esbuild
- 🧪 **Interactive Testing**: Test your tools with real-time execution
- 🚀 **Deployment**: Compile and deploy skills to the Lua platform
- 🔑 **API Key Management**: Securely store, view, and manage your API keys
- 📚 **Comprehensive Documentation**: Complete guides and examples

## Quick Start

1. **Configure your authentication:**
   ```bash
   lua configure
   ```
   Choose between API key or email authentication methods.

2. **Initialize a new skill project:**
   ```bash
   lua init
   ```
   Select your organization and agent, then provide skill details.

3. **Develop your tools:**
   ```bash
   # Create tools in the tools/ directory
   # See template/README.md for examples
   ```

4. **Compile your skill:**
   ```bash
   lua compile
   ```
   Bundles dependencies and creates deployable files.

5. **Test your tools:**
   ```bash
   lua test
   ```
   Interactive testing interface for your tools.

6. **Deploy your skill:**
   ```bash
   lua deploy
   ```
   Deploy to the Lua platform.

## Commands

### `lua configure`

Set up your authentication credentials. You can choose between:

- **API Key**: Direct API key input
- **Email**: Email-based OTP authentication

```bash
lua configure
```

### `lua init`

Initialize a new Lua skill project in the current directory.

```bash
lua init
```

This command will:
- Fetch your organizations and agents from the API
- Let you select an organization by name
- Let you choose an agent from the selected organization
- Prompt for skill name and description
- Create a `lua.skill.toml` configuration file
- Copy template files to the current directory

### `lua apiKey`

Display your stored API key (with confirmation prompt).

```bash
lua apiKey
```

### `lua agents`

Fetch and display your agents from the HeyLua API.

```bash
lua agents
```

### `lua destroy`

Delete your stored API key and credentials.

```bash
lua destroy
```

### `lua compile`

Compile your LuaSkill and bundle all dependencies.

```bash
lua compile
```

This command will:
- Scan your tools for imports and dependencies
- Bundle external packages using esbuild
- Compress the generated code for efficient storage
- Create `.lua/deploy.json` with compiled skill data
- Generate individual tool files in `.lua/` directory

**Options:**
- `--watch` - Watch for changes and recompile automatically
- `--minify` - Minify the bundled code

### `lua test`

Interactive testing interface for your tools.

```bash
lua test
```

Features:
- Tool selection menu
- Input validation with Zod schemas
- Real-time execution in isolated VM context
- Error reporting and debugging
- Mock data support

### `lua deploy`

Deploy your compiled skill to the Lua platform.

```bash
lua deploy
```

**Requirements:**
- Valid API key (configured with `lua configure`)
- Compiled skill (run `lua compile` first)
- Active internet connection

**Output:**
- Skill deployed to your selected agent
- Deployment confirmation and status

## Template System

The Lua CLI includes a comprehensive template system with examples and documentation:

### Template Structure
```
template/
├── README.md              # Complete user guide
├── DEVELOPER.md           # Technical documentation  
├── API.md                 # API reference
├── QUICKSTART.md          # Quick start guide
├── tools/                 # Example tools
│   ├── GetWeatherTool.ts
│   ├── GetUserDataTool.ts
│   ├── CreatePostTool.ts
│   ├── CalculatorTool.ts
│   └── AdvancedMathTool.ts
├── services/              # Example services
│   ├── ApiService.ts
│   ├── GetWeather.ts
│   └── MathService.ts
└── index.ts               # Main skill definition
```

### Getting Started with Templates

1. **Copy the template:**
   ```bash
   cp -r template/ my-skill/
   cd my-skill
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Read the documentation:**
   ```bash
   # Start with the quick start guide
   cat QUICKSTART.md
   
   # Then read the full documentation
   cat README.md
   ```

4. **Create your tools:**
   ```bash
   # Modify existing tools or create new ones
   # See tools/ directory for examples
   ```

## Configuration File

The `lua.skill.toml` file is created when you run `lua init`:

```toml
[agent]
agentId = "your-agent-id"
orgId = "your-organization-id"

[skill]
name = "Your Skill Name"
description = "Description of your skill"
```

## Authentication Methods

### API Key Authentication

1. Run `lua configure`
2. Select "API Key"
3. Enter your API key when prompted
4. The key is validated and stored securely

### Email Authentication

1. Run `lua configure`
2. Select "Email"
3. Enter your email address
4. Check your email for the OTP code
5. Enter the 6-digit OTP code
6. An API key is automatically generated and stored

## Security

- All API keys are stored securely using your system's credential manager
- Email authentication uses OTP (One-Time Password) for secure verification
- Confirmation prompts prevent accidental exposure of sensitive information
- No credentials are stored in plain text

## Development Workflow

### 1. Project Setup
```bash
# Initialize a new skill project
lua init

# Or copy the template
cp -r template/ my-skill/
cd my-skill
npm install
```

### 2. Tool Development
```bash
# Create tools in tools/ directory
# Use TypeScript with Zod validation
# See template/tools/ for examples
```

### 3. Testing
```bash
# Compile your skill
lua compile

# Test your tools interactively
lua test
```

### 4. Deployment
```bash
# Deploy to Lua platform
lua deploy
```

### 5. Iteration
```bash
# Make changes to your tools
# Recompile and test
lua compile && lua test

# Deploy updates
lua deploy
```

## Requirements

- Node.js 16.0.0 or higher
- Valid Lua AI platform account
- TypeScript knowledge (for tool development)
- Basic understanding of Zod schemas

## Development

To contribute to this project:

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Make your changes
5. Test your changes
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue on [GitHub](https://github.com/lua-ai-global/lua-cli/issues)
- Contact: stefan@heylua.ai

## Changelog

### 1.2.0
- **Tool Development Framework**: Complete LuaSkill and LuaTool framework
- **Dependency Bundling**: Automatic bundling of npm packages using esbuild
- **Interactive Testing**: Real-time tool testing with `lua test` command
- **Code Compression**: Gzip compression for efficient storage
- **In-Memory Execution**: VM-based execution without temporary files
- **Comprehensive Documentation**: Complete guides, API reference, and examples
- **Template System**: Rich template with 5 example tools and services
- **TypeScript Support**: Full TypeScript integration with Zod validation
- **Error Handling**: Robust error handling and validation
- **Performance Optimization**: Optimized bundling and execution

### 1.1.0
- **Major Refactoring**: Complete codebase reorganization into modular structure
- **Email Authentication**: Added OTP-based email authentication
- **API Key Display**: New `lua apiKey` command
- **TypeScript Types**: Comprehensive type definitions
- **Improved Architecture**: Separated commands, services, and utilities

### 1.0.0
- Initial release
- API key authentication
- Organization and agent management
- Skill project initialization
- Secure credential storage
