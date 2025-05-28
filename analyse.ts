import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('./uptime-log.json', 'utf8'));

function uptimePercent(days: number) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = data.filter((r: any) => new Date(r.timestamp).getTime() >= since);
  const total = filtered.length;
  const up = filtered.filter((r: any) => r.success).length;
  return total > 0 ? (up / total) * 100 : 0;
}

console.log(`Uptime letzte 30 Tage: ${uptimePercent(30).toFixed(2)}%`);
console.log(`Uptime letzte 100 Tage: ${uptimePercent(100).toFixed(2)}%`);
console.log(`Uptime letzte 365 Tage: ${uptimePercent(365).toFixed(2)}%`);
