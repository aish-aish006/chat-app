// backend/src/routes/video.ts

import express from "express";

const router = express.Router();

/**
 * Simple static Daily room route
 * ✅ No API calls
 * ✅ No payment required
 * ✅ Works with your manual room (https://chattyfy.daily.co/chatapp-demo-room)
 */

router.get("/get-room", (req, res) => {
  res.json({
    name: "chatapp-demo-room",
    url: "https://chattyfy.daily.co/chatapp-demo-room",
  });
});

export default router;
