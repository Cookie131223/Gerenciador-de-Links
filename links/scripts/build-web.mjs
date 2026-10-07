import fs from "node:fs";
import path from "node:path";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

fs.rmSync("dist", { recursive: true, force: true });
fs.cpSync("web", "dist", { recursive: true });
fs.writeFileSync(
  path.join("dist", "config.js"),
  `window.APP_CONFIG = ${JSON.stringify({ SUPABASE_URL: url, SUPABASE_KEY: key })};\n`
);

console.log("Web SPA generated in dist/");
