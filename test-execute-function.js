// Test script using the execute function directly
async function testExecuteFunction() {
  try {
    console.log("🧪 Testing execute function from deploy output...");
    
    // The execute function from the deploy output
    const executeFunctionString = `async (input) => {
  class GetWeatherMain {

      constructor() {

  }

    async getWeather(city) {
        return { weather: "sunny", city: city };
    }
}
  const getWeatherMain = new GetWeatherMain();
  return getWeatherMain.getWeather(input.city);
}`;

    console.log("📝 Execute function string:");
    console.log(executeFunctionString);
    
    // Create the function using eval
    const executeFunction = eval(`(${executeFunctionString})`);
    
    // Test with valid input
    const testInput = { city: "Berlin" };
    console.log("\n📝 Test input:", testInput);
    
    const result = await executeFunction(testInput);
    console.log("✅ Result:", result);
    
    // Verify the result structure
    if (result && result.weather && result.city) {
      console.log("🎉 SUCCESS: Execute function works correctly!");
      console.log(`   Weather: ${result.weather}`);
      console.log(`   City: ${result.city}`);
      
      // Test with different input
      const testInput2 = { city: "Madrid" };
      const result2 = await executeFunction(testInput2);
      console.log("\n📝 Test input 2:", testInput2);
      console.log("✅ Result 2:", result2);
      
    } else {
      console.log("❌ FAILED: Result structure is incorrect");
    }
    
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }
}

testExecuteFunction();
