import { config as loadDotenv } from "dotenv";

loadDotenv();

export interface Settings {
  databaseUrl: string;
  databasePoolMinSize: number;
  databasePoolMaxSize: number;
  databasePoolTimeout: number;
  databasePoolMaxIdle: number;
  databasePoolMaxLifetime: number;
  supabaseUrl: string;
  supabaseKey: string;
  supabaseServiceRoleKey: string;
  jwtSecretKey: string;
  jwtExpiresInHours: number;
  masterAdminEmail: string;
  masterAdminPassword: string;
}

let cachedSettings: Settings | null = null;

export function getSettings(): Settings {
  if (cachedSettings) {
    return cachedSettings;
  }

  cachedSettings = {
    databaseUrl: process.env.DATABASE_URL || "",
    databasePoolMinSize: Number(process.env.DATABASE_POOL_MIN_SIZE || "1"),
    databasePoolMaxSize: Number(process.env.DATABASE_POOL_MAX_SIZE || "10"),
    databasePoolTimeout: Number(process.env.DATABASE_POOL_TIMEOUT || "30"),
    databasePoolMaxIdle: Number(process.env.DATABASE_POOL_MAX_IDLE || "300"),
    databasePoolMaxLifetime: Number(process.env.DATABASE_POOL_MAX_LIFETIME || "1800"),
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseKey: process.env.SUPABASE_KEY || "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    jwtSecretKey: process.env.JWT_SECRET_KEY || "change-me",
    jwtExpiresInHours: Number(process.env.JWT_EXPIRES_IN_HOURS || "12"),
    masterAdminEmail: process.env.MASTER_ADMIN_EMAIL || "",
    masterAdminPassword: process.env.MASTER_ADMIN_PASSWORD || "",
  };

  return cachedSettings;
}
