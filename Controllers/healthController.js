import pool from "../db.config/index.js";

const startTime = Date.now();

async function checkDatabase() {
  const started = Date.now();
  await pool.query("SELECT 1");
  return { ok: true, latencyMs: Date.now() - started };
}

/** Liveness — process is up (no DB). Use for load balancers / Coolify ping. */
export const healthLive = (req, res) => {
  res.status(200).json({
    statusCode: 200,
    status: "ok",
    service: "wotchagotcha-api",
    check: "live",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

/** Readiness — includes database connectivity. */
export const healthReady = async (req, res) => {
  try {
    const database = await checkDatabase();
    res.status(200).json({
      statusCode: 200,
      status: "ok",
      service: "wotchagotcha-api",
      check: "ready",
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: new Date(startTime).toISOString(),
      timestamp: new Date().toISOString(),
      database,
    });
  } catch (err) {
    console.error("Health ready check failed:", err.message);
    res.status(503).json({
      statusCode: 503,
      status: "error",
      service: "wotchagotcha-api",
      check: "ready",
      message: "Database unavailable",
      timestamp: new Date().toISOString(),
    });
  }
};

/** Default health — same as ready (app + DB). Keeps existing /health behavior. */
export const healthCheck = healthReady;
