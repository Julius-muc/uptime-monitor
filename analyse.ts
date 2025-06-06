import * as fs from 'fs';
import fetch from 'node-fetch'; // Ensure using node-fetch v2

const LOG_FILE = './uptime-log.json';
const TEAMS_WEBHOOK_URL = 'https://prod-255.westeurope.logic.azure.com:443/workflows/7020544885b54b19b5a86afeeb3cdebe/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=j5o2PvVtQGcgFFQiFUhnBCgr6XYSvaMht42p3QQGMTo';;

let data: any[] = [];
try {
  data = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
} catch (err) {
  console.error('❌ Fehler beim Einlesen der JSON-Datei:', err);
  process.exit(1);
}

function getAllServiceKeys(): string[] {
  const keys = new Set<string>();
  data.forEach(entry => {
    Object.keys(entry).forEach(key => {
      if (key !== 'timestamp') {
        keys.add(key);
      }
    });
  });
  return Array.from(keys);
}

function uptimePercent(days: number, serviceName: string): number {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  const filtered = data.filter((r: any) => {
    const ts = new Date(r.timestamp).getTime();
    return ts >= since && r.hasOwnProperty(serviceName);
  });

  const total = filtered.length;
  const up = filtered.filter((r: any) => r[serviceName] === true).length;

  return total > 0 ? (up / total) * 100 : 0;
}

async function sendToTeams() {
  const serviceKeys = getAllServiceKeys();
  const timeFrames = [30, 100, 365];

  let textSections: string[] = [];

  let totalUptimes: { [days: number]: number[] } = {
    30: [],
    100: [],
    365: [],
  };

  for (const service of serviceKeys) {
    textSections.push(`**📊 ${service.charAt(0).toUpperCase() + service.slice(1)} Übersicht:**`);
    for (const days of timeFrames) {
      const uptime = uptimePercent(days, service).toFixed(2);
      textSections.push(`• *Letzte ${days} Tage:* ${uptime}%`);
      totalUptimes[days].push(+uptime);
    }
    textSections.push(''); // Add spacing
  }

  // Average uptime
  textSections.push(`**📊 Insgesamt Übersicht:**`);
  for (const days of timeFrames) {
    const avg = totalUptimes[days].length > 0
      ? (totalUptimes[days].reduce((a, b) => a + b, 0) / totalUptimes[days].length).toFixed(2)
      : "0.00";
    textSections.push(`• *Letzte ${days} Tage:* ${avg}%`);
  }

  const title = "Uptime Report";
  const text = textSections.join('\n\n');

  const payload = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.2",
          body: [
            {
              type: "TextBlock",
              text,
              wrap: true
            }
          ],
          actions: [
            {
              type: "Action.OpenUrl",
              title: "Learn More",
              url: "https://adaptivecards.io"
            }
          ]
        }
      }
    ]
  };

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
