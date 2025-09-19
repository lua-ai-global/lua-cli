import { LuaSkill } from "lua-cli/skill";
import GetWeatherTool from "./tools/GetWeatherTool";
import GetUserDataTool from "./tools/GetUserDataTool";
import CreatePostTool from "./tools/CreatePostTool";
import CalculatorTool from "./tools/CalculatorTool";
import AdvancedMathTool from "./tools/AdvancedMathTool";

// Initialize skill with tools
const skill = new LuaSkill();
skill.addTool(new GetWeatherTool());
skill.addTool(new GetUserDataTool());
skill.addTool(new CreatePostTool());
skill.addTool(new CalculatorTool());
skill.addTool(new AdvancedMathTool());

// Test cases
const testCases = [
    { tool: "get_weather", city: "London" },
    { tool: "get_user_data", userId: "user123" },
    { tool: "create_post", title: "Test Post", content: "This is a test post content" },
    { tool: "calculator", operation: "add", a: 5, b: 3 },
    { tool: "advanced_math", operation: "factorial", numbers: [5] },
    { tool: "advanced_math", operation: "is_prime", numbers: [17] },
    { tool: "advanced_math", operation: "fibonacci", numbers: [10] },
    { tool: "advanced_math", operation: "gcd", numbers: [48, 18] },
    // This should fail - wrong property name
    { tool: "get_weather", cityLong: "London", apiKey: "123" }
];

async function runTests() {
    console.log("🧪 Running tool tests...\n");
    
    for (const [index, testCase] of testCases.entries()) {
        try {
            console.log(`Test ${index + 1}: ${testCase.tool}`);
            const result = await skill.run(testCase);
            console.log("✅ Success:", result);
        } catch (error: any) {
            console.log("❌ Error:", error.message);
        }
        console.log(""); // Empty line for readability
    }
}

async function main() {
    try {
        await runTests();
    } catch (error) {
        console.error("💥 Unexpected error:", error);
        process.exit(1);
    }
}

main().catch(console.error);

