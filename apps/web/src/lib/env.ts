import { z } from "zod";

const browserEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().transform((url) => url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000")
});

const optionalSecretSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional()
);

const serverEnvSchema = browserEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: optionalSecretSchema,
  GEMINI_API_KEY: optionalSecretSchema,
  GEMINI_MODEL: z.string().min(1).optional().default("gemini-2.5-flash"),
  TAVILY_API_KEY: optionalSecretSchema
});

export function getBrowserEnv() {
  return browserEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  });
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY
  });
}
