// Test script with error handling
async function testExecuteFunctionWithErrors() {
  try {
    console.log("🧪 Testing execute function with error handling...");
    
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

    // Create the function using eval
    const executeFunction = eval(`(${executeFunctionString})`);
    
    // Test with valid input
    console.log("✅ Test 1: Valid input");
    const result1 = await executeFunction({ city: "Paris" });
    console.log("   Result:", result1);
    
    // Test with missing city property
    console.log("\n✅ Test 2: Missing city property");
    try {
      const result2 = await executeFunction({});
      console.log("   Result:", result2);
    } catch (error) {
      console.log("   Error (expected):", error.message);
    }
    
    // Test with null input
    console.log("\n✅ Test 3: Null input");
    try {
      const result3 = await executeFunction(null);
      console.log("   Result:", result3);
    } catch (error) {
      console.log("   Error (expected):", error.message);
    }
    
    console.log("\n🎉 All tests completed!");
    
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }
}

testExecuteFunctionWithErrors();
