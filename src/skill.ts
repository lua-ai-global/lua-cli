import { ZodType } from "zod";
import { LuaTool } from "./types/index.js";

export { LuaTool };

export class LuaSkill {
    private readonly tools: LuaTool<any, any>[] = [];
    constructor(private readonly apiKey: string) {
    }

    addTool<TInput extends ZodType, TOutput extends ZodType>(tool: LuaTool<TInput, TOutput>): void {
        this.tools.push(tool);
    }

    async run(input: Record<string, any>) {
        const tool = this.tools.find(tool => tool.name === input.tool);
        if (!tool) {
            throw new Error(`Tool ${input.tool} not found`);
        }
        
        // Validate input against the tool's schema
        const validatedInput = tool.inputSchema.parse(input);
        return tool.execute(validatedInput);
    }
}
