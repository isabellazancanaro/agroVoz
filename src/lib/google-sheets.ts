import crypto from "node:crypto";
import type { ApplicationRecord } from "./types";

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const signature = crypto.sign("RSA-SHA256", Buffer.from(`${header}.${claim}`), rawKey.replace(/\\n/g, "\n"));
  const assertion = `${header}.${claim}.${base64url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error("No se pudo autenticar con Google Sheets");
  const data = await response.json();
  return data.access_token as string;
}

export async function appendRecordToSheet(record: ApplicationRecord) {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const token = await getAccessToken();
  if (!spreadsheetId || !token) return { skipped: true };
  const values = [[
    record.created_at, record.operator_name, record.farm_name, record.renspa, record.rfd_number,
    record.lot, record.surface_ha, record.crop, record.variety, record.issue, record.product_name,
    record.active_ingredient, record.recommended_dose, record.applied_dose, record.total_volume,
    record.days_to_harvest, record.machine, record.weather, record.observations, record.message_sid,
  ]];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Aplicaciones!A:T:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
  if (!response.ok) throw new Error(`Google Sheets respondió ${response.status}`);
  return { skipped: false };
}

