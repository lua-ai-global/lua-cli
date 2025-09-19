import { LuaSkill, LuaTool } from '../../src/types/index';
import { z } from 'zod';

describe('LuaSkill', () => {
  let skill: LuaSkill;

  beforeEach(() => {
    skill = new LuaSkill('test-api-key');
  });

  describe('constructor', () => {
    it('should create a LuaSkill instance with API key', () => {
      expect(skill).toBeInstanceOf(LuaSkill);
    });
  });

  describe('addTool', () => {
    it('should add a tool to the skill', () => {
      const inputSchema = z.object({
        city: z.string(),
      });
      const outputSchema = z.object({
        weather: z.string(),
      });

      const tool: LuaTool<typeof inputSchema, typeof outputSchema> = {
        name: 'get_weather',
        description: 'Get weather for a city',
        inputSchema,
        outputSchema,
        execute: async (input: any) => {
          return { weather: 'sunny', city: input.city };
        },
      };

      skill.addTool(tool);
      // Since tools array is private, we test indirectly through run method
      expect(skill).toBeDefined();
    });
  });

  describe('run', () => {
    beforeEach(() => {
      const inputSchema = z.object({
        city: z.string(),
      });
      const outputSchema = z.object({
        weather: z.string(),
      });

      const tool: LuaTool<typeof inputSchema, typeof outputSchema> = {
        name: 'get_weather',
        description: 'Get weather for a city',
        inputSchema,
        outputSchema,
        execute: async (input: any) => {
          return { weather: 'sunny', city: input.city };
        },
      };

      skill.addTool(tool);
    });

    it('should execute a tool with valid input', async () => {
      const result = await skill.run({
        tool: 'get_weather',
        city: 'London',
      });

      expect(result).toEqual({
        weather: 'sunny',
        city: 'London',
      });
    });

    it('should throw error for non-existent tool', async () => {
      await expect(
        skill.run({
          tool: 'non_existent_tool',
          city: 'London',
        })
      ).rejects.toThrow('Tool non_existent_tool not found');
    });

    it('should throw validation error for invalid input', async () => {
      await expect(
        skill.run({
          tool: 'get_weather',
          cityLong: 'London', // Wrong property name
        })
      ).rejects.toThrow();
    });

    it('should throw validation error for missing required field', async () => {
      await expect(
        skill.run({
          tool: 'get_weather',
          // Missing city field
        })
      ).rejects.toThrow();
    });
  });
});

describe('LuaTool interface', () => {
  it('should accept a tool with all required properties', () => {
    const inputSchema = z.object({
      name: z.string(),
    });
    const outputSchema = z.object({
      result: z.string(),
    });

    const tool: LuaTool<typeof inputSchema, typeof outputSchema> = {
      name: 'test_tool',
      description: 'A test tool',
      inputSchema,
      outputSchema,
      execute: async (input) => {
        return { result: `Hello ${input.name}` };
      },
    };

    expect(tool.name).toBe('test_tool');
    expect(tool.description).toBe('A test tool');
    expect(tool.inputSchema).toBe(inputSchema);
    expect(tool.outputSchema).toBe(outputSchema);
    expect(typeof tool.execute).toBe('function');
  });
});
