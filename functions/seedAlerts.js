const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const USER_ID = "eylhN1q46shFnFu6FdxgKqI2I1g2";

const now = new Date();
const inTwoMinutes = new Date(now.getTime() + 2 * 60 * 1000);

const alerts = [
  {
    id: "test-alert-1",
    title: "Test Alert 1 (deleteOnView)",
    message: "Disappears on Yes OR No — just seeing it is enough.",
    scheduledTime: now.toISOString(),
    acknowledged: false,
    deleteOnView: true,
    createdAt: now.toISOString(),
  },
  {
    id: "test-alert-2",
    title: "Test Alert 2 (deleteOnConfirm)",
    message: "Only disappears if you tap Yes. No keeps it alive.",
    scheduledTime: now.toISOString(),
    acknowledged: false,
    deleteOnConfirm: true,
    createdAt: now.toISOString(),
  },
  {
    id: "test-alert-3",
    title: "Test Alert 3 (Recurring + Deep Link)",
    message: "Tap Yes to navigate to Pinned. Recurs every 3 minutes.",
    scheduledTime: inTwoMinutes.toISOString(),
    acknowledged: false,
    deleteOnConfirm: false,
    recurringIntervalMinutes: 3,
    deepLinkTarget: "Pinned",
    createdAt: now.toISOString(),
  },
];

/**
 * Seeds test alerts into masterConfig.
 * @return {Promise<void>}
 */
async function seed() {
  await db.doc(`masterConfig/${USER_ID}`).set(
      {alerts: admin.firestore.FieldValue.arrayUnion(...alerts)},
      {merge: true},
  );
  console.log(`✅ Seeded ${alerts.length} alerts for ${USER_ID}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
