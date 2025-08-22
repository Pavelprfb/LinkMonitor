require('dotenv').config();
const express = require("express");
const axios = require("axios");
const cron = require("node-cron");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // public ফোল্ডার

// ================== MONGODB SETUP ================== //
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB connection error:", err));

const linkSchema = new mongoose.Schema({ link: String });
const Link = mongoose.model("Link", linkSchema);

// ================== MAIL SETUP ================== //
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

function sendMail(subject, text) {
    transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: process.env.MY_INBOX_MAIL,
        subject,
        text
    }, (err, info) => {
        if(err) console.error('Email error:', err);
    });
}

// ================== ROUTES ================== //
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

app.post("/add", async (req, res) => {
    const { url } = req.body;
    if(!url) return res.send("❌ Please provide a URL");

    const exists = await Link.findOne({ link: url });
    if(exists) return res.send("⚠️ This link already exists");

    const newLink = new Link({ link: url });
    await newLink.save();
    sendMail("New Link Added", `✅ New link added: ${url}`);
    res.send("✅ Link added successfully and email sent");
});

app.get("/links", async (req, res) => {
    const links = await Link.find();
    res.json(links.map(l => l.link));
});

app.post("/remove", async (req, res) => {
    const { url } = req.body;
    await Link.deleteOne({ link: url });
    sendMail("Link Deleted", `❌ Link deleted: ${url}`);
    res.send("🗑️ Link removed successfully");
});

// ================== PING SYSTEM ================== //
let nextPingTime = new Date();

// প্রতি 5 মিনিটে পিং
cron.schedule("*/5 * * * *", async () => {
    const allLinks = await Link.find();
    if(allLinks.length === 0) return;

    console.log("⏳ Starting 5-min ping...");
    let results = [];
    for(let l of allLinks) {
        try {
            await axios.get(l.link);
            console.log(`✅ Ping successful (5min): ${l.link}`);
            results.push(`✅ Success: ${l.link}`);
        } catch(err) {
            console.log(`❌ Ping failed (5min): ${l.link}`);
            results.push(`❌ Failed: ${l.link}`);
        }
    }

    // পরবর্তী পিং ৫ মিনিট পরে
    nextPingTime = new Date(new Date().getTime() + 5*60*1000);
});

// প্রতি ঘণ্টায় সারসংক্ষেপ ইমেইল
cron.schedule("0 * * * *", async () => {
    const allLinks = await Link.find();
    if(allLinks.length === 0) return;

    console.log("⏳ Sending hourly summary...");
    let results = [];
    for(let l of allLinks) {
        try {
            await axios.get(l.link);
            results.push(`✅ Success: ${l.link}`);
        } catch(err) {
            results.push(`❌ Failed: ${l.link}`);
        }
    }

    const summary = results.join("\n");
    sendMail("Hourly Ping Summary", summary);
    console.log("📧 Hourly summary email sent");
});

app.get("/next-ping", (req, res) => {
    res.json({ nextPing: nextPingTime });
});

// ================== SERVER ================== //
app.listen(3000, () => {
    console.log("🚀 Server running: http://localhost:3000");
});