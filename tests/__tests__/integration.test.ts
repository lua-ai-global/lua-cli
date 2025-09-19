import { LuaSkill } from '../../src/types/index';
import { z } from 'zod';

describe('Integration Tests', () => {
  describe('Complete Skill Workflow', () => {
    it('should work with complex skill containing multiple tools', async () => {
      const skill = new LuaSkill('test-api-key');

      // Add multiple tools
      const weatherInputSchema = z.object({
        city: z.string(),
      });
      const weatherOutputSchema = z.object({
        weather: z.string(),
        temperature: z.number(),
      });

      skill.addTool({
        name: 'get_weather',
        description: 'Get weather information for a city',
        inputSchema: weatherInputSchema,
        outputSchema: weatherOutputSchema,
        execute: async (input: any) => {
          return {
            weather: 'sunny',
            temperature: 25,
            city: input.city,
          };
        },
      });

      const mathInputSchema = z.object({
        a: z.number(),
        b: z.number(),
        operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
      });
      const mathOutputSchema = z.object({
        result: z.number(),
      });

      skill.addTool({
        name: 'calculate',
        description: 'Perform mathematical calculations',
        inputSchema: mathInputSchema,
        outputSchema: mathOutputSchema,
        execute: async (input: any) => {
          let result: number;
          switch (input.operation) {
            case 'add':
              result = input.a + input.b;
              break;
            case 'subtract':
              result = input.a - input.b;
              break;
            case 'multiply':
              result = input.a * input.b;
              break;
            case 'divide':
              result = input.a / input.b;
              break;
            default:
              throw new Error('Invalid operation');
          }
          return { result };
        },
      });

      // Test weather tool
      const weatherResult = await skill.run({
        tool: 'get_weather',
        city: 'London',
      });

      expect(weatherResult).toEqual({
        weather: 'sunny',
        temperature: 25,
        city: 'London',
      });

      // Test math tool
      const mathResult = await skill.run({
        tool: 'calculate',
        a: 10,
        b: 5,
        operation: 'add',
      });

      expect(mathResult).toEqual({
        result: 15,
      });

      // Test division
      const divisionResult = await skill.run({
        tool: 'calculate',
        a: 20,
        b: 4,
        operation: 'divide',
      });

      expect(divisionResult).toEqual({
        result: 5,
      });
    });

    it('should handle validation errors gracefully', async () => {
      const skill = new LuaSkill('test-api-key');

      const inputSchema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });
      const outputSchema = z.object({
        message: z.string(),
      });

      skill.addTool({
        name: 'validate_user',
        description: 'Validate user information',
        inputSchema,
        outputSchema,
        execute: async (input: any) => {
          return {
            message: `User ${input.email} is ${input.age} years old`,
          };
        },
      });

      // Test with invalid email
      await expect(
        skill.run({
          tool: 'validate_user',
          email: 'invalid-email',
          age: 25,
        })
      ).rejects.toThrow();

      // Test with invalid age
      await expect(
        skill.run({
          tool: 'validate_user',
          email: 'test@example.com',
          age: 16,
        })
      ).rejects.toThrow();

      // Test with valid input
      const result = await skill.run({
        tool: 'validate_user',
        email: 'test@example.com',
        age: 25,
      });

      expect(result).toEqual({
        message: 'User test@example.com is 25 years old',
      });
    });

    it('should work with async operations', async () => {
      const skill = new LuaSkill('test-api-key');

      const inputSchema = z.object({
        url: z.string().url(),
      });
      const outputSchema = z.object({
        status: z.number(),
        data: z.string(),
      });

      skill.addTool({
        name: 'fetch_data',
        description: 'Fetch data from a URL',
        inputSchema,
        outputSchema,
        execute: async (input: any) => {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 10));
          
          return {
            status: 200,
            data: `Data from ${input.url}`,
          };
        },
      });

      const result = await skill.run({
        tool: 'fetch_data',
        url: 'https://api.example.com/data',
      });

      expect(result).toEqual({
        status: 200,
        data: 'Data from https://api.example.com/data',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle tool execution errors', async () => {
      const skill = new LuaSkill('test-api-key');

      const inputSchema = z.object({
        value: z.number(),
      });
      const outputSchema = z.object({
        result: z.number(),
      });

      skill.addTool({
        name: 'divide_by_zero',
        description: 'This will cause an error',
        inputSchema,
        outputSchema,
        execute: async (input: any) => {
          if (input.value === 0) {
            throw new Error('Cannot divide by zero');
          }
          return { result: 100 / input.value };
        },
      });

      // Test normal operation
      const normalResult = await skill.run({
        tool: 'divide_by_zero',
        value: 5,
      });

      expect(normalResult).toEqual({
        result: 20,
      });

      // Test error case
      await expect(
        skill.run({
          tool: 'divide_by_zero',
          value: 0,
        })
      ).rejects.toThrow('Cannot divide by zero');
    });
  });
});
