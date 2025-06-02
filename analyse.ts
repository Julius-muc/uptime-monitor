import * as fs from 'fs';
import fetch from 'node-fetch'; // Ensure using version 2.x

const LOG_FILE = './uptime-log.json';
const TEAMS_WEBHOOK_URL = 'https://prod-255.westeurope.logic.azure.com:443/workflows/7020544885b54b19b5a86afeeb3cdebe/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=j5o2PvVtQGcgFFQiFUhnBCgr6XYSvaMht42p3QQGMTo';

const USE_ADAPTIVE_CARD = false; // Set to true to use AdaptiveCard instead of MessageCard

let data: any[] = [];
try {
  data = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
} catch (err) {
  console.error('❌ Fehler beim Einlesen der JSON-Datei:', err);
  process.exit(1);
}

function uptimePercent(days: number, name: 'api' | 'cloud' | 'website') {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  const filtered = data.filter((r: any) => {
    const ts = new Date(r.timestamp).getTime();
    return ts >= since && r.hasOwnProperty(name);
  });

  const total = filtered.length;
  const up = filtered.filter((r: any) => r[name] === true).length;

  return total > 0 ? (up / total) * 100 : 0;
}

function buildPayload(type: 'card' | 'adaptive', title: string, text: string) {
  if (type === 'adaptive') {
    return {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            type: "AdaptiveCard",
            version: "1.4",
            body: [
              { type: "TextBlock", size: "Large", weight: "Bolder", text: title },
              { type: "TextBlock", text, wrap: true }
            ],
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
          }
        }
      ]
    };
  }

  // Return the array directly (not inside { data: [...] })
  return [
    {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      "summary": title,
      "themeColor": "0076D7",
      "title": title,
      "text": text
    }
  ];
}


async function sendToTeams() {
  const c_uptime30 = uptimePercent(30,'cloud').toFixed(2);
  const c_uptime100 = uptimePercent(100,'cloud').toFixed(2);
  const c_uptime365 = uptimePercent(365,'cloud').toFixed(2);

  const w_uptime30 = uptimePercent(30,'website').toFixed(2);
  const w_uptime100 = uptimePercent(100,'website').toFixed(2);
  const w_uptime365 = uptimePercent(365,'website').toFixed(2);

  const a_uptime30 = uptimePercent(30,'api').toFixed(2);
  const a_uptime100 = uptimePercent(100,'api').toFixed(2);
  const a_uptime365 = uptimePercent(365,'api').toFixed(2);

  const avg_uptime30 = ((+c_uptime30 + +w_uptime30 + +a_uptime30) / 3).toFixed(2);
  const avg_uptime100 = ((+c_uptime100 + +w_uptime100 + +a_uptime100) / 3).toFixed(2);
  const avg_uptime365 = ((+c_uptime365 + +w_uptime365 + +a_uptime365) / 3).toFixed(2);

  const title = "Uptime Report";
  const text = [
  "**📊 Cloud Übersicht:**",
  `• *Letzte 30 Tage:* ${c_uptime30}%`,
  `• *Letzte 100 Tage:* ${c_uptime100}%`,
  `• *Letzte 365 Tage:* ${c_uptime365}%`,
  "**📊 Website Übersicht:**",
  `• *Letzte 30 Tage:* ${w_uptime30}%`,
  `• *Letzte 100 Tage:* ${w_uptime100}%`,
  `• *Letzte 365 Tage:* ${w_uptime365}%`,
  "**📊 API Übersicht:**",
  `• *Letzte 30 Tage:* ${a_uptime30}%`,
  `• *Letzte 100 Tage:* ${a_uptime100}%`,
  `• *Letzte 365 Tage:* ${a_uptime365}%`,
  "**📊 Insgesamt Übersicht:**",
  `• *Letzte 30 Tage:* ${avg_uptime30}%`,
  `• *Letzte 100 Tage:* ${avg_uptime100}%`,
  `• *Letzte 365 Tage:* ${avg_uptime365}%`

].join('\n\n');
const payload = {
  "type": "message",
  "attachments": [
    {
      "contentType": "application/vnd.microsoft.card.adaptive",
      "content": {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.2",
        "body": [
          {
            "type": "TextBlock",
            "text": text,
            "wrap": true
          }
        ],
        "actions": [
          {
            "type": "Action.OpenUrl",
            "title": "Learn More",
            "url": "https://adaptivecards.io"
          }
        ]
      }
    }
  ]
}
  //const payload = buildPayload(USE_ADAPTIVE_CARD ? 'adaptive' : 'card', title, text);
	console.log(JSON.stringify(payload, null, 2));
  try {
    const res = await fetch(TEAMS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.error('❌ Fehler beim Senden an Teams:', res.statusText);
    } else {
      console.log('✅ Nachricht erfolgreich an Teams gesendet.');
    }
  } catch (error) {
    console.error('❌ Fehler beim Senden an Teams:', error);
  }
}

sendToTeams();
