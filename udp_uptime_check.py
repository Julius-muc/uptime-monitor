import socket
import time
import json
from datetime import datetime, timezone, timedelta
from influxdb_client import InfluxDBClient
import os
import pytest

# ----------- CONFIGURATION -----------

UDP_IP = "46.243.202.54"
UDP_PORT = 1025
# Current time and 3 minutes ago
now = datetime.now()
three_min_ago = now - timedelta(minutes=3)

UPTIME_LOG_FILE = "uptime-log.json"

# Get current time and round down to the hour
now = datetime.now().replace(minute=0, second=0, microsecond=0)

# Format timestamps
now_str = now.strftime("%Y/%m/%d %H:%M:%S")
one_hour_ago_str = (now - timedelta(hours=1)).strftime("%Y/%m/%d %H:%M:%S")
two_hours_ago_str = (now - timedelta(hours=2)).strftime("%Y/%m/%d %H:%M:%S")
three_hours_ago_str = (now - timedelta(hours=3)).strftime("%Y/%m/%d %H:%M:%S")

# Final payload
udp_payload = {
    "IMEI": "AAAAAAAAAAAAAA3",
    "IMSI": "901405119966222",
    "Model": "RS485-NB",
    "Payload": "01e8fde8fde8fde8fd34210100",
    "battery": 3.614,
    "signal": 26,
    "time": now_str,
    "1": ["01e8fde8fde8fde8fd34210100", one_hour_ago_str],
    "2": ["01e8fde8fde8fde8fd34210100", two_hours_ago_str],
    "3": ["01e8fde8fde8fde8fd34210100", three_hours_ago_str]
}
INFLUX_URL = os.getenv("INFLUX_NAME")
INFLUX_TOKEN = os.getenv("INFLUX_API")
INFLUX_ORG = "treesense"
INFLUX_BUCKET = "sensor_data"
IMEI = "AAAAAAAAAAAAAA3"





def write_uptime_log(success: bool):
    timestamp = datetime.now(timezone.utc).isoformat()
    entry = {
        "timestamp": timestamp,
        "udp": success
    }

    try:
        with open(UPTIME_LOG_FILE, "r", encoding="utf-8") as f:
            logs = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        print("error")

    logs.append(entry)

    with open(UPTIME_LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(logs, f, indent=2)
# ----------- STEP 1: SEND UDP PACKET -----------

print(f"Sending UDP packet to {UDP_IP}:{UDP_PORT}")
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.sendto(json.dumps(udp_payload).encode('utf-8'), (UDP_IP, UDP_PORT))
sock.close()

# Allow time for ingestion (tweak as needed)
time.sleep(5)

# ----------- STEP 2: QUERY INFLUXDB -----------
try:
    client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
    query_api = client.query_api()
    
    query = f'''
    from(bucket: "{INFLUX_BUCKET}")
      |> range(start: -4h)
      |> filter(fn: (r) => r["imei"] == "{IMEI}")
      |> filter(fn: (r) => r["_field"] == "signal")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n:1)
    '''
    
    tables = query_api.query(query)
    latest_time = None


    tables = query_api.query(query)
    for table in tables:
        for record in table.records:
            latest_time = record.get_time()
            print(f"Latest signal time: {latest_time.isoformat()}")

except (ReadTimeoutError, ApiException, Exception) as e:
    print(f"⚠️ InfluxDB query failed or timed out: {str(e)}")
    write_uptime_log(False)
    exit(0)

# ----------- STEP 3: VERIFY TIMESTAMP -----------

now = datetime.now(timezone.utc)
if latest_time is None:
    print("❌ No datapoint received in the last 5 minutes.")
    write_uptime_log(False)
    exit(0)

time_diff = (now - latest_time).total_seconds()

if time_diff < 14400:
    print("✅ Datapoint received within the last 4 hours.")
    write_uptime_log(True)
    exit(0)
else:
    print("❌ Datapoint is older than 4 hours.")
    write_uptime_log(False)
    exit(0)
