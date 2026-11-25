import "dotenv/config";

let rawHost = (process.env.DB_HOST || process.env[" DB_HOST"] || "").trim();
let port = Number(process.env.DB_PORT || process.env[" DB_PORT"]) || 5432;

if (rawHost.includes(":")) {
  const [extractedHost, extractedPort] = rawHost.split(":");
  rawHost = extractedHost;
  if (extractedPort && !process.env.DB_PORT) {
    port = Number(extractedPort);
  }
}

const host = rawHost;
const user = (process.env.DB_USER || process.env[" DB_USER"] || "").trim();
const password = process.env.DB_PASSWORD || process.env[" DB_PASSWORD"] || "";
const database = (process.env.DB_NAME || process.env[" DB_NAME"] || "").trim();

const connectionString = (process.env.DATABASE_URL || "").trim();

export const databaseConfig = connectionString
  ? {
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    }
  : {
  host,
  user,
  password,
  database,
  port,
  connectionTimeoutMillis: 10000,
};

