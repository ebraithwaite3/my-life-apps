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

exports.addToPinnedList = functions.https.onRequest(async (req, res) => {
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

  const {items, checklist} = req.body;

  console.log("📋 Checklist:", checklist);
  console.log("📝 Items:", items);
  console.log("📊 Item count:", items?.length || 0);

  // Validate
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({error: "Items array required"});
  }

  if (!checklist) {
    return res.status(400).json({error: "Checklist name required"});
  }

  try {
    const db = admin.firestore();

    // 🔒 Hardcoded for Eric
    const USER_ID = "LCqH5hKx2bP8Q5gDGPmzRd65PB32";

    // Get the pinned checklists doc
    const docRef = db.collection("pinnedChecklists").doc(USER_ID);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.error("❌ Document not found");
      return res.status(404).json({error: "Pinned checklists not found"});
    }

    const data = docSnap.data();
    const pinnedChecklists = data.pinned || [];

    console.log(`🔍 Found ${pinnedChecklists.length} pinned checklists`);

    // Find the checklist by name (case-insensitive)
    const checklistIndex = pinnedChecklists.findIndex(
        (c) => c.name.toLowerCase() === checklist.toLowerCase(),
    );

    // Create new items with capitalized names
    const newItems = items.map((itemText) => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: capitalizeWords(itemText), // ✨ Capitalize each word
      completed: false,
    }));

    console.log("✨ Creating items:", newItems);

    let isNewChecklist = false;
    let updatedChecklist;

    if (checklistIndex === -1) {
      // Checklist not found - create a new one
      console.log(`📝 Creating new checklist: "${checklist}"`);
      isNewChecklist = true;

      updatedChecklist = {
        id: `checklist_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
        name: checklist,
        items: newItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: pinnedChecklists.length, // Add to end
      };

      // Add to pinned array
      pinnedChecklists.push(updatedChecklist);
    } else {
      // Checklist found - add items to existing
      const foundChecklist = pinnedChecklists[checklistIndex];
      console.log(`✅ Found checklist: "${foundChecklist.name}"`);

      updatedChecklist = {
        ...foundChecklist,
        items: [...(foundChecklist.items || []), ...newItems],
        updatedAt: new Date().toISOString(),
      };

      // Update the pinned array
      pinnedChecklists[checklistIndex] = updatedChecklist;
    }

    // Save back to Firestore
    await docRef.update({
      pinned: pinnedChecklists,
      updatedAt: new Date().toISOString(),
    });

    const actionLog = isNewChecklist ?
      `✅ Created new checklist "${updatedChecklist.name}" ` +
        `with ${newItems.length} items` :
      `✅ Added ${newItems.length} items to "${updatedChecklist.name}"`;

    console.log(actionLog);

    // Siri-friendly response
    const itemCount = newItems.length;
    const message = isNewChecklist ?
      `Created ${updatedChecklist.name} and added ${itemCount} ${
        itemCount === 1 ? "item" : "items"
      }` :
      `Added ${itemCount} ${itemCount === 1 ? "item" : "items"} to ${
        updatedChecklist.name
      }`;

    return res.status(200).json({
      message: message,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      error: "Failed to add items",
      message: error.message,
    });
  }
});
