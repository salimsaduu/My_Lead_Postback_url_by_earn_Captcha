import express from "express";
import admin from "firebase-admin";

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Firebase Setup
const firebaseKey = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(firebaseKey),
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com"
});

const db = admin.firestore();

// ✅ Secure token (so only MyLead can trigger)
const MYLEAD_SECRET = process.env.MYLEAD_SECRET || "MySecretKey123";

// ✅ $1 = 5000 coins
const COIN_RATE = 5000;

// ----------------------
// 🔥 POSTBACK HANDLER
// ----------------------
app.get("/", async (req, res) => {
  const { subid, payout, secret } = req.query;

  // Validation
  if (!subid || !payout) {
    return res.status(400).send("❌ Missing parameters");
  }

  // Security check
  if (secret !== MYLEAD_SECRET) {
    return res.status(403).send("🚫 Unauthorized");
  }

  const coins = Math.round(Number(payout) * COIN_RATE);

  try {
    const userRef = db.collection("users").doc(subid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.send(`⚠️ User not found: ${subid}`);
    }

    // Update user coins
    await userRef.update({
      coins: admin.firestore.FieldValue.increment(coins),
      lastEarned: new Date().toISOString()
    });

    console.log(`✅ ${subid} credited with ${coins} coins ($${payout})`);
    res.send(`OK - ${subid} credited with ${coins} coins`);
  } catch (error) {
    console.error("❌ Firebase update failed:", error);
    res.status(500).send("Internal Server Error");
  }
});

// ----------------------
// 🔥 HEALTH CHECK
// ----------------------
app.get("/ping", (req, res) => {
  res.send("✅ MyLead Postback API working fine!");
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
