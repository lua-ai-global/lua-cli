# Lua CLI

A command-line interface for the Lua AI platform that helps you manage agents, organizations, and skills with ease.

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
- 🔑 **API Key Management**: Securely store, view, and manage your API keys
- 📦 **Template System**: Quick project setup with pre-configured templates

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

3. **View your API key:**
   ```bash
   lua apiKey
   ```

4. **List your agents:**
   ```bash
   lua agents
   ```

5. **Delete your stored credentials:**
   ```bash
   lua destroy
   ```

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

## Requirements

- Node.js 16.0.0 or higher
- Valid Lua AI platform account

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
