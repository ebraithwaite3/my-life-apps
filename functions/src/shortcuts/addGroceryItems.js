const functions = require("firebase-functions");
const admin = require("firebase-admin");

// ✨ Helper to capitalize first letter of each word
const capitalizeWords = (str) => {
  return str
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
};

exports.addGroceryItems = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).send("");
  }

  console.log("📦 Received request");
  console.log("Method:", req.method);
  console.log("Body:", JSON.stringify(req.body, null, 2));

  const {items, user} = req.body;

  console.log("👤 User:", user);
  console.log("🛒 Items:", items);
  console.log("📊 Item count:", items?.length || 0);

  // Validate
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({error: "Items array required"});
  }

  try {
    const db = admin.firestore();

    // 🔒 Hardcoded for your family
    const GROUP_ID = "e041a76d-ed3a-4255-bcd3-d6ea3c25711b";
    const GROCERY_CHECKLIST_ID = "6a2ff914-55c7-45c2-85c0-050b84b77a9b";

    // Get the pinned checklists doc
    const docRef = db.collection("pinnedChecklists").doc(GROUP_ID);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.error("❌ Document not found");
      return res.status(404).json({error: "Grocery list not found"});
    }

    const data = docSnap.data();
    const pinnedChecklists = data.pinned || [];

    // Find the grocery checklist
    const checklistIndex = pinnedChecklists.findIndex(
        (c) => c.id === GROCERY_CHECKLIST_ID,
    );

    if (checklistIndex === -1) {
      console.error("❌ Grocery checklist not found in pinned array");
      return res.status(404).json({error: "Grocery checklist not found"});
    }

    // Create new items with capitalized names
    const newItems = items.map((itemText) => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: capitalizeWords(itemText), // ✨ Capitalize each word
      completed: false,
    }));

    console.log("✨ Creating items:", newItems);

    // Add items to the checklist
    const updatedChecklist = {
      ...pinnedChecklists[checklistIndex],
      items: [...(pinnedChecklists[checklistIndex].items || []), ...newItems],
      updatedAt: new Date().toISOString(),
    };

    // Update the pinned array
    pinnedChecklists[checklistIndex] = updatedChecklist;

    // Save back to Firestore
    await docRef.update({
      pinned: pinnedChecklists,
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Added ${newItems.length} items to grocery list`);

    return res.status(200).json({
      success: true,
      message: `Added ${newItems.length} items from ${user}`,
      itemsAdded: newItems.map((i) => i.name),
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      error: "Failed to add items",
      message: error.message,
    });
  }
});
