import express from "express";
import axios from "axios";
import cron from "node-cron";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTML ফাইল সার্ভ করার জন্য
app.use(express.static(path.join(process.cwd(), "public")));

let links = JSON.parse(fs.readFileSync("links.json"));

// লিঙ্ক যোগ করার API
app.post("/add", (req, res) => {
    const { url } = req.body;
    if (!url) return res.send("❌ URL দিন");
    if (!links.includes(url)) {
        links.push(url);
        fs.writeFileSync("links.json", JSON.stringify(links, null, 2));
        return res.send("✅ লিঙ্ক যোগ হয়েছে");
    }
    res.send("⚠️ এই লিঙ্ক আগে থেকেই আছে");
});

// সব লিঙ্ক দেখার API
app.get("/links", (req, res) => {
    res.json(links);
});

// লিঙ্ক মুছে ফেলার API
app.post("/remove", (req, res) => {
    const { url } = req.body;
    links = links.filter(link => link !== url);
    fs.writeFileSync("links.json", JSON.stringify(links, null, 2));
    res.send("🗑️ লিঙ্ক মুছে ফেলা হয়েছে");
});

// প্রতি ৫ মিনিটে পিং সিস্টেম
cron.schedule("*/5 * * * *", async () => {
    console.log("⏳ পিং শুরু হচ্ছে...");
    for (let link of links) {
        try {
            await axios.get(link);
            console.log(`✅ পিং সফল: ${link}`);
        } catch (err) {
            console.log(`❌ পিং ব্যর্থ: ${link}`);
        }
    }
});

app.listen(3000, () => {
    console.log("🚀 সার্ভার চালু: http://localhost:3000");
});