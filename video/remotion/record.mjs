// Records the live ZeroLag console (served from IBM LinuxONE through the SSH tunnel)
// as 1080p clips, with a visible cursor, timed to the voiceover.
//   node record.mjs [baseUrl]   (run from video/remotion)
import puppeteer from "puppeteer-core";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "public", "clips");
const BASE = process.argv[2] || "http://localhost:8001";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FFMPEG = execSync("where ffmpeg").toString().split(/\r?\n/)[0].trim();
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CURSOR = `
(() => {
  if (document.getElementById("__cur")) return;
  const c = document.createElement("div");
  c.id = "__cur";
  c.innerHTML = '<svg width="26" height="34" viewBox="0 0 26 34"><path d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L22 19.5 Z" fill="#fff" stroke="#111" stroke-width="2" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, { position: "fixed", left: "960px", top: "620px", zIndex: 2147483647, pointerEvents: "none",
    transition: "left .75s cubic-bezier(.3,.7,.2,1), top .75s cubic-bezier(.3,.7,.2,1)", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.35))" });
  document.documentElement.appendChild(c);
  const st = document.createElement("style");
  st.textContent = "@keyframes __ring{from{transform:translate(-50%,-50%) scale(.3);opacity:.9}to{transform:translate(-50%,-50%) scale(1.6);opacity:0}}" +
    ".__ring{position:fixed;width:46px;height:46px;border-radius:50%;border:3px solid #0f62fe;pointer-events:none;z-index:2147483646;animation:__ring .5s ease-out forwards}";
  document.head.appendChild(st);
  window.__adopt = host => (host || document.documentElement).appendChild(c);
  window.__move = (x, y) => { c.style.left = x + "px"; c.style.top = y + "px"; };
  window.__ring = (x, y) => { const r = document.createElement("div"); r.className = "__ring"; r.style.left = x + "px"; r.style.top = y + "px";
    document.documentElement.appendChild(r); setTimeout(() => r.remove(), 600); };
})();`;

async function point(page, sel) {
  return page.evaluate(s => {
    const el = typeof s === "string" ? document.querySelector(s) : null;
    const r = el.getBoundingClientRect();
    return { x: r.left + Math.min(r.width / 2, 120), y: r.top + r.height / 2 };
  }, sel);
}
async function moveTo(page, sel, wait = 800) {
  await page.waitForSelector(sel, { visible: true, timeout: 15000 });
  const p = await point(page, sel);
  await page.evaluate((x, y) => window.__move(x, y), p.x, p.y);
  await sleep(wait);
  return p;
}
async function click(page, sel) {
  const p = await moveTo(page, sel);
  await page.evaluate((x, y) => window.__ring(x, y), p.x, p.y);
  await sleep(120);
  await page.evaluate(s => document.querySelector(s).click(), sel);
}

async function newPage(browser, hash) {
  const page = await browser.newPage();
  // 1536x864 CSS px at 1.25x = 1920x1080 video with larger, readable UI
  await page.setViewport({ width: 1536, height: 864, deviceScaleFactor: 1.25 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await page.goto(`${BASE}/${hash}`, { waitUntil: "networkidle2", timeout: 60000 }).catch(() => {});
  await page.evaluate(CURSOR);
  return page;
}

async function record(page, name, fn) {
  const rec = await page.screencast({ path: path.join(OUT, name), ffmpegPath: FFMPEG, scale: 1.25 });
  const t0 = Date.now();
  await fn(t0);
  await rec.stop();
  console.log(name, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
const at = (t0, s) => sleep(Math.max(0, t0 + s * 1000 - Date.now()));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--window-size=1920,1080", "--hide-scrollbars", "--force-color-profile=srgb"] });

// ---------- clip 1: overview → alert queue → held digital-arrest alert ----------
{
  const page = await newPage(browser, "#overview");
  await sleep(70000); // let the live chart fill before recording
  // wait (unrecorded) until a held payment with the "police" message is in the queue
  for (let i = 0; i < 180; i++) {
    const ok = await page.evaluate(() => (typeof state !== "undefined" ? state.alerts : []).some(a => a.decision === "HOLD" && a.source === "stream" && /police/i.test(a.nudge?.en || "")));
    if (ok) break;
    await sleep(1000);
  }
  await page.evaluate(() => { const c = state.alerts.filter(a => a.decision === "HOLD" && a.source === "stream" && /police/i.test(a.nudge?.en || ""));
    window.__pick = (c.find(a => (a.reasons || []).length >= 2) || c[0])?.seq; });
  await record(page, "console.webm", async t0 => {
    await at(t0, 1.5); await moveTo(page, ".g-kpi .card:nth-child(2)");
    await at(t0, 3.8); await moveTo(page, ".g-kpi .card:nth-child(5)");
    await at(t0, 6.6); await click(page, "#t-alerts");
    await page.evaluate(() => { $("#autoUpd").checked = false; });
    await at(t0, 8.2);
    const sel = await page.evaluate(() => { const tr = document.querySelector(`#queue tr[data-seq="${window.__pick}"]`) || document.querySelector("#queue tr[data-seq]");
      const wrap = tr.closest(".table-wrap"); wrap.scrollTo({ top: Math.max(0, tr.offsetTop - 160), behavior: "smooth" }); tr.id = "__pickrow"; return "#__pickrow"; });
    await sleep(900);
    await click(page, sel);
    await sleep(200);
    await page.evaluate(() => { document.activeElement?.blur(); window.__adopt(document.querySelector("#detail")); });
    await at(t0, 16.6);
    await page.evaluate(() => { const m = [...document.querySelectorAll("#dBody h3")].find(h => /customer sees/i.test(h.textContent));
      m?.scrollIntoView({ behavior: "smooth", block: "start" }); });
    await at(t0, 26.5);
  });
  await page.close();
}

// ---------- clip 2: test a payment (digital arrest → held, everyday → allowed) ----------
{
  const page = await newPage(browser, "#test");
  await sleep(2500);
  await record(page, "test.webm", async t0 => {
    await at(t0, 1.2); await moveTo(page, "#cust");
    await at(t0, 3.0); await click(page, '.preset[data-p="arrest"]');
    await at(t0, 4.2); await moveTo(page, "#result .verdict", 900);
    await at(t0, 9.5); await moveTo(page, "#result .reasons");
    await at(t0, 13.2); await click(page, '.preset[data-p="normal"]');
    await at(t0, 14.4); await moveTo(page, "#result .verdict", 900);
    await at(t0, 19.8);
  });
  await page.close();
}

await browser.close();
