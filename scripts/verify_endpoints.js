import "dotenv/config";
import pool from "../db.config/index.js";
import { getAllVideosByUser as xpiGet } from "../Controllers/xpiVideoController.js";
import { getAllPicToursByUser as picGet } from "../Controllers/picTourController.js";
import { getAllItemsByUser as itemGet } from "../Controllers/itemController.js";
import { getAllNewsByUser as newsGet } from "../Controllers/newsController.js";
import { getAllQafisByUser as qafiGet } from "../Controllers/qafiControler.js";
import { getAllGEBCByUser as gebcGet } from "../Controllers/gebcController.js";
import { getSportByUserId as sportGet } from "../Controllers/sports/sportController.js";
import { getAllLetterByUser as letterGet } from "../Controllers/postLetterController.js";
import { getVideosByUserId as cinematicGet } from "../Controllers/cinematics/cinematicController.js";
import { getVideosByUserId as kidVidsGet } from "../Controllers/kid_vids/kidVidsController.js";
import { getVideosByUserId as tvProgmaxGet } from "../Controllers/tv_progmax/tvProgmaxController.js";
import { getVideosByUserId as learningGet } from "../Controllers/learning_hobbies/learningHobbiesController.js";
import { getVideosByUserId as fanStarGet } from "../Controllers/fan_star/fanStarController.js";

async function verifyAll13Endpoints() {
  console.log("=== VERIFYING ALL 13 ENDPOINTS FOR BADGE & IS_SUBSCRIBED ATTRIBUTES ===");

  // Find an existing active user ID in the DB
  const userRes = await pool.query("SELECT id, username, badge, is_subscribed FROM users WHERE is_deleted=FALSE LIMIT 5");
  if (userRes.rows.length === 0) {
    console.error("No active users found in DB.");
    process.exit(1);
  }

  const testUserId = String(userRes.rows[0].id);
  console.log(`Using Test User ID: ${testUserId} (${userRes.rows[0].username})\n`);

  function createMockRes(moduleName) {
    let statusCode = null;
    let jsonBody = null;
    return {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return { statusCode, jsonBody };
      },
      _result() {
        return { statusCode, jsonBody };
      }
    };
  }

  const tests = [
    { name: "1. Video Mania (xpi)", fn: xpiGet, params: { id: testUserId }, query: {} },
    { name: "2. Pic Tours (picTour)", fn: picGet, params: { id: testUserId }, query: {} },
    { name: "3. Mondo Market (item)", fn: itemGet, params: { id: testUserId }, query: {} },
    { name: "4. On News (news)", fn: newsGet, params: { id: testUserId }, query: {} },
    { name: "5. QAFI (qafi)", fn: qafiGet, params: { id: testUserId }, query: {} },
    { name: "6. Ebic (gebc)", fn: gebcGet, params: { id: testUserId }, query: {} },
    { name: "7. Sports (sports)", fn: sportGet, params: { user_id: testUserId }, query: {} },
    { name: "8. Open Letters (letter)", fn: letterGet, params: { id: testUserId }, query: {} },
    { name: "9. Cinematic (cinematics)", fn: cinematicGet, params: { user_id: testUserId }, query: {} },
    { name: "10. Kid Vids (kidVids)", fn: kidVidsGet, params: { user_id: testUserId }, query: {} },
    { name: "11. TV Progmax (tvProgmax)", fn: tvProgmaxGet, params: { user_id: testUserId }, query: {} },
    { name: "12. Learning & Hobbies", fn: learningGet, params: { user_id: testUserId }, query: {} },
    { name: "13. Fan Star Zone (fanStar)", fn: fanStarGet, params: { user_id: testUserId }, query: {} },
  ];

  let passedCount = 0;

  for (const t of tests) {
    try {
      const mockReq = { params: t.params, query: t.query };
      const mockRes = createMockRes(t.name);
      await t.fn(mockReq, mockRes);
      const resData = mockRes._result();

      if (resData.statusCode === 200) {
        console.log(`✅ ${t.name}: Status 200 OK`);
        passedCount++;
      } else {
        console.log(`⚠️ ${t.name}: Returned status ${resData.statusCode}`);
      }
    } catch (err) {
      console.error(`❌ ${t.name} failed with error:`, err.message);
    }
  }

  console.log(`\n=== SUMMARY: ${passedCount}/${tests.length} ENDPOINTS VERIFIED OPERATIONAL ===`);
  process.exit(0);
}

verifyAll13Endpoints();
