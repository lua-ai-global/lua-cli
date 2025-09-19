export interface UserData {
  uid: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  mobileNumbers: any[];
  emailAddresses: EmailAddress[];
  country: Country;
  admin: Admin;
  channels: Record<string, any>;
  rights: Record<string, any>;
  setupPersona: Record<string, any>;
  notifications: Record<string, any>;
}

export interface EmailAddress {
  address: string;
  validated: boolean;
  validatedAt: number;
  _id: string;
}

export interface Country {
  code: string;
  name: string;
}

export interface Admin {
  userId: string;
  orgs: Organization[];
  id: string;
  createdAt: number;
  __v: number;
}

export interface Organization {
  id: string;
  rights?: string[];
  agents: Agent[];
  registeredName: string;
  country: string;
  phoneNumber?: string | null;
  type: string;
}

export interface Agent {
  agentId: string;
  rights: string[];
  name: string;
}

export interface OTPResponse {
  signInToken: string;
}

export interface ApiKeyResponse {
  message: string;
  userId: string;
  apiKey: string;
  apiId: string;
}

// Lua Tool System Types
import { ZodType } from "zod";

export interface LuaTool<TInput extends ZodType = ZodType, TOutput extends ZodType = ZodType> {
    name: string;
    description: string;
    inputSchema: TInput;
    outputSchema: TOutput;
    execute: (input: any) => Promise<any>;
}

export declare class LuaSkill {
    private readonly apiKey;
    private readonly tools;
    constructor(apiKey: string);
    addTool<TInput extends ZodType, TOutput extends ZodType>(tool: LuaTool<TInput, TOutput>): void;
    run(input: Record<string, any>): Promise<any>;
}
