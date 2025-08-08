const express = require("express");
const axios = require("axios");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve HTML files
app.use(express.static(path.join(process.cwd(), "public")));

let links = JSON.parse(fs.readFileSync("links.json"));

// API to add link
app.post("/add", (req, res) => {
    const { url } = req.body;
    if (!url) return res.send("❌ Please provide a URL");
    if (!links.includes(url)) {
        links.push(url);
        fs.writeFileSync("links.json", JSON.stringify(links, null, 2));
        return res.send("✅ Link added successfully");
    }
    res.send("⚠️ This link already exists");
});

// API to get all links
app.get("/links", (req, res) => {
    res.json(links);
});

// API to remove link
app.post("/remove", (req, res) => {
    const { url } = req.body;
    links = links.filter(link => link !== url);
    fs.writeFileSync("links.json", JSON.stringify(links, null, 2));
    res.send("🗑️ Link removed successfully");
});

// Ping system every 5 minutes
cron.schedule("*/5 * * * *", async () => {
    console.log("⏳ Starting ping...");
    for (let link of links) {
        try {
            await axios.get(link);
            console.log(`✅ Ping successful: ${link}`);
        } catch (err) {
            console.log(`❌ Ping failed: ${link}`);
        }
    }
});

app.listen(3000, () => {
    console.log("🚀 Server running: http://localhost:3000");
});