import { z } from "zod";

const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .default("4000")
    .transform((val) => parseInt(val, 10)),

  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL URL"),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  API_INTERNAL_SECRET: z
    .string()
    .min(32, "API_INTERNAL_SECRET must be at least 32 characters"),

  // CORS
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  // Logging
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),

  // GitHub API
  GITHUB_TOKEN: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("\n❌ Invalid environment variables:\n");
    const errors = result.error.format();
    console.error(JSON.stringify(errors, null, 2));
    console.error(
      "\nPlease check your .env file against .env.example\n"
    );
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
