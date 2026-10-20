import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => String(cell).trim()));
}

function table(filePath) {
  const rows = parseCSV(fs.readFileSync(filePath, "utf8"));
  const headers = rows[0];
  const index = Object.fromEntries(headers.map((header, i) => [header, i]));
  const records = rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, i) => {
      record[header] = cells[i] ?? "";
    });
    return record;
  });
  return { headers, index, records };
}

function num(value) {
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function published(value) {
  const match = String(value).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error(`Unrecognised publish time: ${value}`);
  const [, month, day, year, hour, minute] = match;
  const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const time = `${hour.padStart(2, "0")}:${minute}`;
  const timestamp = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  ).getTime();
  return { date, time, timestamp };
}

function titleFrom(description) {
  const line = String(description)
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find(Boolean);
  if (!line) return "Untitled post";
  const clean = line.replace(/\s+/g, " ").trim();
  if (clean.length <= 140) return clean;
  const cut = clean.slice(0, 138);
  const space = cut.lastIndexOf(" ");
  return `${(space > 60 ? cut.slice(0, space) : cut).trim()}…`;
}

const instagram = table(path.join(root, "data", "INSTA.csv"));
const facebook = table(path.join(root, "data", "FB.csv"));

for (const header of [
  "Post ID",
  "Account username",
  "Account name",
  "Description",
  "Duration (sec)",
  "Publish time",
  "Permalink",
  "Post type",
  "Views",
  "Reach",
  "Likes",
  "Shares",
  "Follows",
  "Comments",
  "Saves",
]) {
  if (!(header in instagram.index)) throw new Error(`INSTA.csv missing ${header}`);
}

for (const header of [
  "Video asset ID",
  "Page name",
  "Duration (sec)",
  "Publish time",
  "Reach",
  "3-second video views",
  "Seconds viewed",
  "Reactions",
  "Comments",
  "Shares",
]) {
  if (!(header in facebook.index)) throw new Error(`FB.csv missing ${header}`);
}

const igPosts = instagram.records.map((record) => {
  const when = published(record["Publish time"]);
  return {
    id: `ig-${record["Post ID"]}`,
    platform: "instagram",
    title: titleFrom(record.Description),
    date: when.date,
    time: when.time,
    timestamp: when.timestamp,
    durationSec: num(record["Duration (sec)"]),
    reach: num(record.Reach),
    views: num(record.Views),
    likes: num(record.Likes),
    comments: num(record.Comments),
    shares: num(record.Shares),
    saves: num(record.Saves),
    follows: num(record.Follows),
    reactions: 0,
    watchSeconds: 0,
    permalink: record.Permalink || null,
    type: record["Post type"] || "Instagram post",
    pairId: null,
  };
});

const fbPosts = facebook.records.map((record) => {
  const when = published(record["Publish time"]);
  return {
    id: `fb-${record["Video asset ID"]}`,
    platform: "facebook",
    title: "Facebook video",
    date: when.date,
    time: when.time,
    timestamp: when.timestamp,
    durationSec: num(record["Duration (sec)"]),
    reach: num(record.Reach),
    views: num(record["3-second video views"]),
    likes: 0,
    comments: num(record.Comments),
    shares: num(record.Shares),
    saves: 0,
    follows: 0,
    reactions: num(record.Reactions),
    watchSeconds: num(record["Seconds viewed"]),
    permalink: record["Page ID"]
      ? `https://www.facebook.com/${record["Page ID"]}/videos/${record["Video asset ID"]}`
      : null,
    type: "Facebook video",
    pairId: null,
  };
});

const used = new Set();
let matched = 0;
for (const video of fbPosts) {
  let best = null;
  let bestScore = Infinity;
  for (const post of igPosts) {
    if (used.has(post.id)) continue;
    const minutes = Math.abs(video.timestamp - post.timestamp) / 60000;
    if (minutes > 30) continue;
    const durationGap = Math.abs(video.durationSec - post.durationSec);
    if (durationGap > 10) continue;
    const score = minutes + durationGap;
    if (score < bestScore) {
      best = post;
      bestScore = score;
    }
  }
  if (!best) continue;
  used.add(best.id);
  video.pairId = best.id;
  best.pairId = best.id;
  video.title = best.title;
  matched += 1;
}

const posts = [...igPosts, ...fbPosts]
  .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id))
  .map(({ timestamp, ...post }) => post);

const report = {
  account: instagram.records[0]["Account name"] || "Store1920",
  instagramUsername: instagram.records[0]["Account username"] || "",
  facebookPage: facebook.records[0]["Page name"] || "",
  sources: { instagram: "INSTA.csv", facebook: "FB.csv" },
  posts,
};

fs.mkdirSync(path.join(root, "src", "data"), { recursive: true });
fs.writeFileSync(path.join(root, "src", "data", "posts.json"), JSON.stringify(report));

const reach = (list) => list.reduce((sum, post) => sum + post.reach, 0);
console.log(`Instagram posts: ${igPosts.length}`);
console.log(`Facebook videos: ${fbPosts.length}`);
console.log(`Matched cross-posts: ${matched}`);
console.log(`Instagram reach: ${reach(igPosts)}`);
console.log(`Facebook reach: ${reach(fbPosts)}`);
console.log("Top Facebook videos:");
[...fbPosts]
  .sort((a, b) => b.reach - a.reach)
  .slice(0, 5)
  .forEach((post) => console.log(`  ${post.reach}  ${post.date}  ${post.title}`));
