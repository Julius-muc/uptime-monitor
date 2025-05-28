import * as fs from 'fs';
import fetch from 'node-fetch';  // Make sure to install node-fetch: npm install node-fetch@2

const TEAMS_WEBHOOK_URL = 'https://prod-239.westeurope.logic.azure.com:443/workflows/ca39fee0242f40ceb3cd4320745e0e5d/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ZVXpyH5GIaoScPd8kLd7RmDO1kd8HlcKMVJ309TY1x';

const data = JSON.parse(fs.readFileSync('./uptime-log.json', 'utf8'));

function uptimePercent(days: number) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = data.filter((r: any) => new Date(r.timestamp).getTime() >= since);
  const total = filtered.length;
  const up = filtered.filter((r: any) => r.success).length;
  return total > 0 ? (up / total) * 100 : 0;
}

async function sendToTeams() {
  const uptime30 = uptimePercent(30).toFixed(2);
  const uptime100 = uptimePercent(100).toFixed(2);
  const uptime365 = uptimePercent(365).toFixed(2);

  const message = {
    text: `Uptime letzte 30 Tage: ${uptime30}%\nUptime letzte 100 Tage: ${uptime100}%\nUptime letzte 365 Tage: ${uptime365}%`
  };

  try {
    const res = await fetch(TEAMS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!res.ok) {
      console.error('Fehler beim Senden an Teams:', res.statusText);
    } else {
      console.log('Nachricht erfolgreich an Teams gesendet.');
    }
  } catch (error) {
    console.error('Fehler beim Senden an Teams:', error);
  }
}

sendToTeams();