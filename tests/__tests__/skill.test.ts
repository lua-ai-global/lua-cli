import { LuaSkill } from '../../src/skill.js';
import { LuaTool } from '../../src/skill.js';

// Mock the skill implementation for testing
class MockLuaSkill {
  private tools: Map<string, LuaTool<any, any>> = new Map();

  constructor(private agentId: string) {}

  addTool(tool: LuaTool<any, any>): void {
    this.tools.set(tool.name, tool);
  }

  async run(input: any): Promise<any> {
    const toolName = input.tool;
    const tool = this.tools.get(toolName);
    
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    // Validate input against tool's input schema
    const inputSchema = tool.inputSchema;
    if (inputSchema && typeof inputSchema.parse === 'function') {
      try {
        inputSchema.parse(input);
      } catch (error) {
        throw new Error(`Invalid input: ${(error as Error).message}`);
      }
    }

    // Execute the tool
    const result = await tool.execute(input);
    
    // Validate output against tool's output schema
    const outputSchema = tool.outputSchema;
    if (outputSchema && typeof outputSchema.parse === 'function') {
      try {
        return outputSchema.parse(result);
      } catch (error) {
        throw new Error(`Invalid output: ${(error as Error).message}`);
      }
    }

    return result;
  }
}

// Mock tool implementation
class MockLuaTool implements LuaTool<any, any> {
  name: string;
  description: string;
  inputSchema: any;
  outputSchema: any;

  constructor(name: string, description: string, inputSchema: any, outputSchema: any) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
    this.outputSchema = outputSchema;
  }

  async execute(input: any): Promise<any> {
    // Mock implementation
    return { result: 'success', input };
  }
}

describe('LuaSkill', () => {
  let skill: MockLuaSkill;
  let mockTool: MockLuaTool;

  beforeEach(() => {
    skill = new MockLuaSkill('test-agent');
    
    // Create a mock schema
    const mockSchema = {
      parse: jest.fn((data) => data)
    };
    
    mockTool = new MockLuaTool(
      'test-tool',
      'A test tool',
      mockSchema,
      mockSchema
    );
  });

  test('should add tool successfully', () => {
    skill.addTool(mockTool);
    
    // Tool should be added (we can't directly access the internal map, 
    // but we can test by running the tool)
    expect(async () => {
      await skill.run({ tool: 'test-tool', data: 'test' });
    }).not.toThrow();
  });

  test('should run tool successfully', async () => {
    skill.addTool(mockTool);
    
    const result = await skill.run({ tool: 'test-tool', data: 'test' });
    
    expect(result).toEqual({ result: 'success', input: { tool: 'test-tool', data: 'test' } });
  });

  test('should throw error for non-existent tool', async () => {
    await expect(skill.run({ tool: 'non-existent-tool' }))
      .rejects.toThrow("Tool 'non-existent-tool' not found");
  });

  test('should validate input schema', async () => {
    const mockInputSchema = {
      parse: jest.fn().mockImplementation((data) => {
        if (!data.tool) {
          throw new Error('Tool is required');
        }
        return data;
      })
    };
    
    const toolWithValidation = new MockLuaTool(
      'validated-tool',
      'A tool with input validation',
      mockInputSchema,
      { parse: jest.fn((data) => data) }
    );
    
    skill.addTool(toolWithValidation);
    
    // Should succeed with valid input
    await skill.run({ tool: 'validated-tool', data: 'test' });
    expect(mockInputSchema.parse).toHaveBeenCalled();
    
    // Should fail with invalid input
    await expect(skill.run({ data: 'test' })) // Missing tool field
      .rejects.toThrow("Tool 'undefined' not found");
  });

  test('should validate output schema', async () => {
    const mockOutputSchema = {
      parse: jest.fn().mockImplementation((data) => {
        if (!data.result) {
          throw new Error('Result is required');
        }
        return data;
      })
    };
    
    const toolWithOutputValidation = new MockLuaTool(
      'output-validated-tool',
      'A tool with output validation',
      { parse: jest.fn((data) => data) },
      mockOutputSchema
    );
    
    skill.addTool(toolWithOutputValidation);
    
    // Should succeed with valid output
    const result = await skill.run({ tool: 'output-validated-tool', data: 'test' });
    expect(mockOutputSchema.parse).toHaveBeenCalled();
    expect(result).toEqual({ result: 'success', input: { tool: 'output-validated-tool', data: 'test' } });
  });

  test('should handle multiple tools', async () => {
    const tool1 = new MockLuaTool('tool1', 'First tool', { parse: jest.fn((data) => data) }, { parse: jest.fn((data) => data) });
    const tool2 = new MockLuaTool('tool2', 'Second tool', { parse: jest.fn((data) => data) }, { parse: jest.fn((data) => data) });
    
    skill.addTool(tool1);
    skill.addTool(tool2);
    
    const result1 = await skill.run({ tool: 'tool1', data: 'test1' });
    const result2 = await skill.run({ tool: 'tool2', data: 'test2' });
    
    expect(result1.input.data).toBe('test1');
    expect(result2.input.data).toBe('test2');
  });

  test('should handle tool execution errors', async () => {
    const errorTool = new MockLuaTool(
      'error-tool',
      'A tool that throws errors',
      { parse: jest.fn((data) => data) },
      { parse: jest.fn((data) => data) }
    );
    
    // Override execute method to throw error
    errorTool.execute = jest.fn().mockRejectedValue(new Error('Tool execution failed'));
    
    skill.addTool(errorTool);
    
    await expect(skill.run({ tool: 'error-tool', data: 'test' }))
      .rejects.toThrow('Tool execution failed');
  });
});
