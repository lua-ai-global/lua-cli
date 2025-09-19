// Test script using actual deploy output
import fs from 'fs';

async function testActualDeployOutput() {
  try {
    console.log("🧪 Testing actual deploy output...");
    
    // Read the deploy output and extract JSON
    const deployText = fs.readFileSync('deploy-output.json', 'utf-8');
    const jsonStart = deployText.indexOf('{');
    const jsonEnd = deployText.lastIndexOf('}') + 1;
    const jsonString = deployText.substring(jsonStart, jsonEnd);
    
    const deployOutput = JSON.parse(jsonString);
    
    console.log("📦 Deploy output loaded:");
    console.log(`   Version: ${deployOutput.version}`);
    console.log(`   Skills Name: ${deployOutput.skillsName}`);
    console.log(`   Tools Count: ${deployOutput.tools.length}`);
    
    if (deployOutput.tools.length > 0) {
      const tool = deployOutput.tools[0];
      console.log(`\n🔧 Testing tool: ${tool.name}`);
      console.log(`   Description: ${tool.description}`);
      
      // Create the function using eval
      const executeFunction = eval(`(${tool.execute})`);
      
      // Test with valid input
      const testInput = { city: "Tokyo" };
      console.log("📝 Test input:", testInput);
      
      const result = await executeFunction(testInput);
      console.log("✅ Result:", result);
      
      // Verify the result structure
      if (result && result.weather && result.city) {
        console.log("🎉 SUCCESS: Actual deploy output works correctly!");
        console.log(`   Weather: ${result.weather}`);
        console.log(`   City: ${result.city}`);
      } else {
        console.log("❌ FAILED: Result structure is incorrect");
      }
    }
    
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }
}

testActualDeployOutput();