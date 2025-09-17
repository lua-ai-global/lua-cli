import inquirer from "inquirer";
import { 
  saveApiKey, 
  checkApiKey, 
  requestEmailOTP, 
  verifyOTPAndGetToken, 
  generateApiKey 
} from "../services/auth.js";

export async function configureCommand(): Promise<void> {
  // Choose authentication method
  const { authMethod } = await inquirer.prompt([
    {
      type: "list",
      name: "authMethod",
      message: "Choose authentication method:",
      choices: [
        { name: "API Key", value: "api-key" },
        { name: "Email", value: "email" }
      ]
    }
  ]);

  if (authMethod === "api-key") {
    // Existing API key flow
    const answers = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: "Enter your API key",
        mask: "*",
      },
    ]);
    const data = await checkApiKey(answers.apiKey);
    if (!data) {
      console.error("❌ Invalid API key");
      process.exit(1);
    }
    await saveApiKey(answers.apiKey);
    console.log("✅ API key saved securely.");
  } else if (authMethod === "email") {
    // Email authentication flow
    const { email } = await inquirer.prompt([
      {
        type: "input",
        name: "email",
        message: "Enter your email address:",
        validate: (input: string) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || "Please enter a valid email address";
        }
      }
    ]);

    console.log("📧 Sending OTP to your email...");
    const otpSent = await requestEmailOTP(email);
    if (!otpSent) {
      console.error("❌ Failed to send OTP. Please try again.");
      process.exit(1);
    }

    console.log("✅ OTP sent successfully!");

    const { pin } = await inquirer.prompt([
      {
        type: "input",
        name: "pin",
        message: "Enter the OTP code:",
        validate: (input: string) => {
          return input.length === 6 || "OTP must be 6 digits";
        }
      }
    ]);

    console.log("🔐 Verifying OTP...");
    const signInToken = await verifyOTPAndGetToken(email, pin);
    if (!signInToken) {
      console.error("❌ Invalid OTP. Please try again.");
      process.exit(1);
    }

    console.log("✅ OTP verified successfully!");
    console.log("🔑 Generating API key...");

    const apiKey = await generateApiKey(signInToken);
    if (!apiKey) {
      console.error("❌ Failed to generate API key. Please try again.");
      process.exit(1);
    }

    await saveApiKey(apiKey);
    console.log("✅ API key generated and saved securely.");
  }
}
