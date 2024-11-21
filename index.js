require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

// Environment variables
const databaseUrl = process.env.Database_conn;
const isProduction = process.env.ENV === "production";

// Initialize app
const app = express();
app.use(express.json());

// CORS middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: "*",
    allowedHeaders: "*",
  })
);

// MongoDB client
const client = new MongoClient(databaseUrl);

let db;
(async () => {
  try {
    await client.connect();
    db = client.db("JPO");
    console.log("MongoDB connected!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
})();

// Increment ID function
async function getId() {
  try {
    const idsCollection = db.collection("IDS");
    const document = await idsCollection.findOne({ _id: new ObjectId("67347e436291c21e7c2d1ad5") });

    if (!document) {
      throw new Error("ID not found");
    }

    const currentId = document.ID;
    const newId = currentId + 20;

    await idsCollection.updateOne(
      { _id: new ObjectId("67347e436291c21e7c2d1ad5") },
      { $set: { ID: newId } }
    );

    return { id: currentId };
  } catch (err) {
    console.error("Error getting ID:", err);
    throw new Error("Failed to retrieve or update ID");
  }
}

// Get items
app.get("/item", async (req, res) => {
  try {
    const idResponse = await getId();
    const id = idResponse.id;

    const itemsCursor = db.collection("DB_0").find().skip(id).limit(20);
    const items = await itemsCursor.toArray();

    if (!items || items.length === 0) {
      return res.status(404).json({ detail: "Items not found" });
    }

    const formattedItems = items.map((item, idx) => ({
      item: { tn: item.tn, en: item.en },
      id: id + idx,
    }));

    res.json(formattedItems);
  } catch (err) {
    console.error("Error fetching items:", err);
    res.status(500).json({ detail: "Internal Server Error" });
  }
});

// Write item
app.post("/write_item", async (req, res) => {
  const { orig_id, tn, en, status } = req.body;

  const currentDate = new Date().toISOString().split("T")[0];
  const itemToInsert = {
    orig_id,
    modified_tn: tn,
    modified_en: en,
    status: status || null,
    created_at: currentDate,
  };

  try {
    const result = await db.collection("DB_1").insertOne(itemToInsert);
    res.status(201).json({
      message: "Item inserted successfully",
      inserted_id: result.insertedId,
    });
  } catch (err) {
    console.error("Error inserting item:", err);
    res.status(500).json({ detail: "Internal Server Error" });
  }
});

// Start the server
const PORT = 8001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.export = app;