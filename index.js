import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

// Load environment variables FIRST
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // replaces body-parser

// MongoDB configuration from .env
const MONGO_URI = process.env.MONGO_URI;
const DBNAME = process.env.DBNAME;
const COLLECTION = process.env.COLLECTION;

// Server configuration from .env (with defaults for local dev)
const PORT = process.env.PORT ?? 8081;
const HOST = process.env.HOST ?? "0.0.0.0";

// Create client and DB handles
const client = new MongoClient(MONGO_URI);
const db = client.db(DBNAME);

// Simple test route
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Simple name test route (for exam screenshot)
app.get("/name", (req, res) => {
  res.send("My name is James Rhodes");
});

//
// ============ GET ALL CONTACTS ============
//
app.get("/contacts", async (req, res) => {
  try {
    await client.connect();
    console.log("Node connected successfully to GET MongoDB");

    const query = {};
    const results = await db
      .collection(COLLECTION)
      .find(query)
      .limit(100)
      .toArray();

    console.log(results);
    res.status(200).json(results); // JSON response
  } catch (err) {
    console.error("Error in GET /contacts:", err);
    res.status(500).json({ message: "Error fetching contacts" });
  }
});

//
// ============ GET ONE CONTACT BY NAME ============
//
app.get("/contacts/:name", async (req, res) => {
  try {
    await client.connect();
    console.log("Node connected successfully to GET -id MongoDB");

    const contactName = req.params.name;
    console.log("Contact to find:", contactName);

    const query = { contact_name: contactName };
    const result = await db.collection(COLLECTION).findOne(query);

    console.log("Result:", result);
    if (!result) {
      return res.status(404).json({ message: "Contact not found" });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("Error in GET /contacts/:name:", err);
    res.status(500).json({ message: "Error fetching contact" });
  }
});

//
// ============ POST NEW CONTACT ============
//
app.post("/contacts", async (req, res) => {
  try {
    // Validate body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ message: "Bad request: No data provided." });
    }

    // Extract fields from body
    const { contact_name, phone_number, message, image_url } = req.body;

    await client.connect();
    console.log("Node connected successfully to POST MongoDB");

    const contactsCollection = db.collection(COLLECTION);

    // Check if contact already exists by name
    const existingContact = await contactsCollection.findOne({
      contact_name: contact_name,
    });

    if (existingContact) {
      return res.status(409).json({
        message: `Contact with name '${contact_name}' already exists.`,
      });
    }

    // Create and insert new document
    const newDocument = {
      contact_name,
      phone_number,
      message,
      image_url,
    };

    const result = await contactsCollection.insertOne(newDocument);
    console.log("Document inserted:", result);

    // Respond to frontend with JSON
    res.status(201).json({ message: "New contact added successfully" });
  } catch (error) {
    console.error("Error in POST /contacts:", error);
    res
      .status(500)
      .json({ message: "Failed to add contact: " + error.message });
  }
});

// ============ DELETE CONTACT BY NAME ============
//
app.delete("/contacts/:name", async (req, res) => {
  try {
    const name = req.params.name;
    console.log("Contact to delete :", name);

    await client.connect();
    console.log("Node connected successfully to DELETE MongoDB");

    const contactsCollection = db.collection(COLLECTION);

    const existingContact = await contactsCollection.findOne({
      contact_name: name,
    });

    if (!existingContact) {
      return res.status(404).json({
        message: `Contact with name ${name} does NOT exist.`,
      });
    }

    const query = { contact_name: name };
    const results = await contactsCollection.deleteOne(query);
    console.log("Delete results:", results);

    res.status(200).json({
      message: `Contact ${name} was DELETED successfully.`,
    });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error: " + error.message });
  }
});

// ============ UPDATE CONTACT BY NAME (PUT) ============
//
app.put("/contacts/:name", async (req, res) => {
  try {
    const originalName = req.params.name;

    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ message: "Bad request: No data provided." });
    }

    const { contact_name, phone_number, message, image_url } = req.body;

    await client.connect();
    console.log("Node connected successfully to PUT MongoDB");

    const contactsCollection = db.collection(COLLECTION);

    const existingContact = await contactsCollection.findOne({
      contact_name: originalName,
    });

    if (!existingContact) {
      return res.status(404).json({
        message: `Contact with name ${originalName} does NOT exist.`,
      });
    }

    const updatedDoc = {
      contact_name: contact_name || originalName,
      phone_number: phone_number ?? existingContact.phone_number,
      message: message ?? existingContact.message,
      image_url: image_url ?? existingContact.image_url,
    };

    const result = await contactsCollection.updateOne(
      { contact_name: originalName },
      { $set: updatedDoc }
    );
    console.log("Update results:", result);

    res.status(200).json({
      message: `Contact '${originalName}' was UPDATED successfully.`,
    });
  } catch (error) {
    console.error("Error updating contact:", error);
    res
      .status(500)
      .json({ message: "Failed to update contact: " + error.message });
  }
});

// Start server (HOST + PORT for Render)
app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
