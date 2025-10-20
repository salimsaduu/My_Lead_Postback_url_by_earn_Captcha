const express = require("express");
const admin = require("firebase-admin");
const app = express();

// 🪙 1 USD = 5000 coins
const COINS_PER_DOLLAR = 5000;

// 🔐 Firebase initialization
// Agar aap Vercel env variable use karna chahte ho:
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

// Agar aap direct file use karna chahte ho:
// const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://<earn-captcha-bot-latest>.firebaseio.com"  // 👉 apna Firebase project ID daalna
});

const db = admin.firestore();

app.get("/postback", async (req, res) => {
  try {
    const { subid, payout, transaction_id } = req.query;

    if (!subid || !payout || !transaction_id) {
      return res.status(400).send("❌ Missing parameters");
    }

    const payoutAmount = parseFloat(payout);
    const coins = Math.round(payoutAmount * COINS_PER_DOLLAR);

    console.log(`✅ Conversion Received:
    SubID: ${subid}
    Payout: $${payoutAmount}
    Coins to Add: ${coins}
    Transaction: ${transaction_id}`);

    // 🔥 Firestore me user ka wallet update
    const userRef = db.collection("users").doc(subid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).send("❌ User not found");
    }

    const currentCoins = userDoc.data().walletCoins || 0;
    const newBalance = currentCoins + coins;

    await userRef.update({
      walletCoins: newBalance,
      lastTransactionId: transaction_id,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`🪙 ${coins} coins added to UID: ${subid}`);

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Error in postback:", error);
    res.status(500).send("Server error");
  }
});

app.listen(3000, () => console.log("🚀 Postback server running"));
