import keytar from "keytar";
import fetch from "node-fetch";
import { UserData, OTPResponse, ApiKeyResponse } from "../types/index.js";

const SERVICE = "lua-cli";
const ACCOUNT = "api-key";

export async function saveApiKey(apiKey: string): Promise<void> {
  await keytar.setPassword(SERVICE, ACCOUNT, apiKey);
}

export async function loadApiKey(): Promise<string | null> {
  return keytar.getPassword(SERVICE, ACCOUNT);
}

export async function deleteApiKey(): Promise<boolean> {
  return keytar.deletePassword(SERVICE, ACCOUNT);
}

export async function checkApiKey(apiKey: string): Promise<UserData> {
  const response = await fetch("https://api.heylua.ai/admin", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    console.error(`❌ Invalid API key`);
    process.exit(1);
  }

  return await response.json() as UserData;
}

export async function requestEmailOTP(email: string): Promise<boolean> {
  try {
    const response = await fetch("https://auth.heylua.ai/otp", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "email",
        email: email
      })
    });

    return response.ok;
  } catch (error) {
    console.error("❌ Error requesting OTP:", error);
    return false;
  }
}

export async function verifyOTPAndGetToken(email: string, pin: string): Promise<string | null> {
  try {
    const response = await fetch("https://auth.heylua.ai/otp/verify", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pin: pin,
        type: "email",
        email: email
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as OTPResponse;
    return data.signInToken;
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    return null;
  }
}

export async function generateApiKey(signInToken: string): Promise<string | null> {
  try {
    const response = await fetch("https://auth.heylua.ai/profile/apiKey", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${signInToken}`,
        "Content-Type": "application/json"
      },
      body: ""
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as ApiKeyResponse;
    return data.apiKey;
  } catch (error) {
    console.error("❌ Error generating API key:", error);
    return null;
  }
}
