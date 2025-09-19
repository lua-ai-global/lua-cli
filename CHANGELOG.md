# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2024-09-19

### Added
- **Tool Development Framework**: Complete LuaSkill and LuaTool framework for building custom tools
- **Dependency Bundling**: Automatic bundling of npm packages using esbuild
- **Interactive Testing**: Real-time tool testing with `lua test` command
- **Code Compression**: Gzip compression for efficient storage of bundled code
- **In-Memory Execution**: VM-based execution without temporary files
- **Comprehensive Documentation**: Complete guides, API reference, and examples
- **Template System**: Rich template with 5 example tools and services
- **TypeScript Support**: Full TypeScript integration with Zod validation
- **Error Handling**: Robust error handling and validation throughout
- **Performance Optimization**: Optimized bundling and execution

### New Commands
- **`lua compile`**: Bundle dependencies and compile LuaSkills
- **`lua test`**: Interactive testing interface for tools
- **`lua deploy`**: Deploy compiled skills to the Lua platform

### Technical Improvements
- **esbuild Integration**: Fast bundling of external dependencies
- **VM Context**: Secure in-memory execution environment
- **Schema Validation**: Zod-based input/output validation
- **Service Architecture**: Reusable service components
- **Template Examples**: Calculator, Math, Weather, API, and File operation tools
- **Documentation Suite**: README, Developer Guide, API Reference, and Quick Start

### Security
- **Sandboxed Execution**: Tools run in isolated VM contexts
- **Input Validation**: Comprehensive Zod schema validation
- **Error Isolation**: Proper error handling prevents crashes

## [1.1.0] - 2024-01-XX

### Added
- **Email Authentication**: New email-based OTP authentication method in `lua configure`
- **API Key Display**: New `lua apiKey` command to view stored API key
- **Modular Architecture**: Complete codebase refactoring into organized modules
- **TypeScript Types**: Comprehensive type definitions for all API responses
- **Command Structure**: Individual command files for better maintainability

### Changed
- **Project Structure**: Reorganized codebase into logical directories:
  - `src/commands/` - Individual command implementations
  - `src/services/` - API and authentication services
  - `src/types/` - TypeScript interface definitions
  - `src/utils/` - Utility functions
- **Main File**: Reduced `src/index.ts` from 392 lines to 39 lines
- **Authentication Flow**: Enhanced `lua configure` with dual authentication methods
- **Error Handling**: Improved error messages and validation throughout

### Technical Improvements
- **Code Organization**: Separated concerns for better maintainability
- **Type Safety**: Added proper TypeScript interfaces for all API responses
- **Reusability**: Services can now be shared across multiple commands
- **Scalability**: Easy to add new commands without cluttering main file
- **Testing Ready**: Modular structure enables independent testing

### Security
- **OTP Verification**: Secure email-based authentication with 6-digit codes
- **Token Management**: Proper handling of sign-in tokens and API key generation
- **Confirmation Prompts**: Added safety confirmations for sensitive operations

## [1.0.0] - 2024-01-XX

### Added
- **Initial Release**: First version of Lua CLI
- **API Key Authentication**: Direct API key input and validation
- **Project Initialization**: `lua init` command for creating new skill projects
- **Agent Management**: `lua agents` command to fetch and display agents
- **Credential Management**: `lua destroy` command to delete stored API keys
- **Template System**: Automatic template file copying for new projects
- **Secure Storage**: API keys stored using system credential manager
- **Interactive Prompts**: User-friendly command-line interface with inquirer
- **Organization Selection**: Choose from available organizations
- **Agent Selection**: Select agents within chosen organizations
- **TOML Configuration**: Generate `lua.skill.toml` configuration files

### Features
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Secure**: Uses keytar for secure credential storage
- **User-friendly**: Interactive prompts and clear error messages
- **Template-based**: Quick project setup with pre-configured templates
- **Validation**: Input validation for email addresses and OTP codes

### Technical Details
- **Node.js**: Requires Node.js 16.0.0 or higher
- **TypeScript**: Built with TypeScript for type safety
- **Dependencies**: Uses commander, inquirer, keytar, and node-fetch
- **ES Modules**: Modern ES module syntax throughout
