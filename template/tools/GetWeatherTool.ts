import { LuaTool } from "lua-cli/skill";
import { z } from "zod";
import GetWeatherMain from "../services/GetWeather";

const inputSchema = z.object({ city: z.string() });
const outputSchema = z.object({ weather: z.string() });

export default class GetWeatherTool implements LuaTool<typeof inputSchema, typeof outputSchema>{
    name: string;
    description: string;
    inputSchema: typeof inputSchema;
    outputSchema: typeof outputSchema;

    constructor() {
        this.name = "get_weather";
        this.description = "Get the weather for a given city";
        this.inputSchema = inputSchema;
        this.outputSchema = outputSchema;
    }

    async execute(input: z.infer<typeof inputSchema>) {
        return { weather: "sunny", city: input.city };
    }
}