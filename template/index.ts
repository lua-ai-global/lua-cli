import z from "zod";
import { LuaSkill, LuaTool } from "lua-cli/skill";
import GetWeatherTool from "./tools/GetWeatherTool";
import GetUserDataTool from "./tools/GetUserDataTool";
import CreatePostTool from "./tools/CreatePostTool";

const skill = new LuaSkill("123");
skill.addTool(new GetWeatherTool());
skill.addTool(new GetUserDataTool());
skill.addTool(new CreatePostTool());

async function main() {
    try {
        // Test weather tool
        console.log("Weather tool:", await skill.run({ tool: "get_weather", city: "London" }));
        
        // Test user data tool with axios
        console.log("User data tool:", await skill.run({ tool: "get_user_data", userId: "user123" }));
        
        // Test post creation tool with axios
        console.log("Post creation tool:", await skill.run({ tool: "create_post", title: "Test Post", content: "This is a test post content" }));
        
        // This should fail - wrong property name
        console.log("Invalid input:", await skill.run({ tool: "get_weather", cityLong: "London", apiKey: "123" }));
    } catch (error: any) {
        console.error("Validation error:", error.message);
    }
}

main().catch(console.error);

