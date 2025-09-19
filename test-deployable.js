// Test script to verify the deployable execute function works with eval()
const deployableExecute = `async (input) => {
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

async function testDeployableFunction() {
  try {
    console.log("🧪 Testing deployable execute function...");
    
    // Create the function using eval
    const executeFunction = eval(`(${deployableExecute})`);
    
    // Test with valid input
    const testInput = { city: "London" };
    console.log("📝 Test input:", testInput);
    
    const result = await executeFunction(testInput);
    console.log("✅ Result:", result);
    
    // Verify the result structure
    if (result && result.weather && result.city) {
      console.log("🎉 SUCCESS: Deployable function works correctly!");
      console.log(`   Weather: ${result.weather}`);
      console.log(`   City: ${result.city}`);
    } else {
      console.log("❌ FAILED: Result structure is incorrect");
    }
    
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }
}

testDeployableFunction();
