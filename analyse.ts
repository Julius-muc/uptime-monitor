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

function uptimePercent(days: number) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = data.filter((r: any) => new Date(r.timestamp).getTime() >= since);
  const total = filtered.length;
  const up = filtered.filter((r: any) => r.success).length;
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
  const uptime30 = uptimePercent(30).toFixed(2);
  const uptime100 = uptimePercent(100).toFixed(2);
  const uptime365 = uptimePercent(365).toFixed(2);

  const title = "Uptime Report";
  const text = [
    `Uptime letzte 30 Tage: ${uptime30}%`,
    `Uptime letzte 100 Tage: ${uptime100}%`,
    `Uptime letzte 365 Tage: ${uptime365}%`
  ].join('\n');

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
