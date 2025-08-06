import socket
import time
import json
from datetime import datetime, timezone, timedelta
import os
import requests



# ----------- CONFIGURATION -----------

UDP_IP = "46.243.202.54"    
UDP_PORT = 1025

# Your TTN Simulation Config
TTN_API_KEY = os.getenv("TTN_API_KEY")
TTN_APP_ID = "pulse-s-2023-07"
TTN_DEVICE_ID = "pulse-s-0001"
TTN_SIMULATE_URL = f"https://eu1.cloud.thethings.network/api/v3/as/applications/{TTN_APP_ID}/devices/{TTN_DEVICE_ID}/up/simulate"

# InfluxDB Config
INFLUX_URL = os.getenv("INFLUX_NAME")
INFLUX_TOKEN = os.getenv("INFLUX_API")
INFLUX_ORG = "treesense"
INFLUX_BUCKET = "sensor_data"

# Device IDs for queries
IMEI = "AAAAAAAAAAAAAA3"
TTN_DEV_EUI = "0004A30B010452FC"

UPTIME_LOG_FILE = "uptime-log.json"

# ----------- Helper functions -----------



def send_udp_packet():
    nowr = datetime.now()
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    now_str = now.strftime("%Y/%m/%d %H:%M:%S")
    now_strr = nowr.strftime("%Y/%m/%d %H:%M:%S")
    one_hour_ago_str = (now - timedelta(hours=1)).strftime("%Y/%m/%d %H:%M:%S")
    two_hours_ago_str = (now - timedelta(hours=2)).strftime("%Y/%m/%d %H:%M:%S")
    three_hours_ago_str = (now - timedelta(hours=3)).strftime("%Y/%m/%d %H:%M:%S")

    udp_payload = {
        "IMEI": IMEI,
        "IMSI": "901405119966222",
        "Model": "RS485-NB",
        "Payload": "01e8fde8fde8fde8fd34210100",
        "battery": 3.614,
        "signal": 26,
        "time": now_strr,
        "1": ["01e8fde8fde8fde8fd34210100", one_hour_ago_str],
        "2": ["01e8fde8fde8fde8fd34210100", two_hours_ago_str],
        "3": ["01e8fde8fde8fde8fd34210100", three_hours_ago_str]
    }

    print(f"Sending UDP packet to {UDP_IP}: {udp_payload}")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.sendto(json.dumps(udp_payload).encode('utf-8'), (UDP_IP, UDP_PORT))
    sock.close()
    #time.sleep(5)  # Wait for ingestion


def simulate_ttn_uplink():
    now_dt = datetime.now(timezone.utc)  # keep as datetime
    now_str = now_dt.isoformat().replace("+00:00", "Z")  # string format for TTN
    now_ts = int(now_dt.timestamp())  # integer timestamp
    payload = {
        "end_device_ids": {
            "device_id": TTN_DEVICE_ID,
            "application_ids": {"application_id": TTN_APP_ID},
            "dev_eui": TTN_DEV_EUI,
            "join_eui": "0004A30B0103B1BF",
            "dev_addr": "260B3523"
        },
        "correlation_ids": ["gs:uplink:01K1ZED8R4AV6STYN959VQS6V6"],
        "received_at": now_str,
        "uplink_message": {
            "session_key_id": "AYxdn/mH/5t4ycMmHWkE/A==",
            "f_port": 1,
            "f_cnt": 55949,
            "frm_payload": "ABTBACvJq+w=",
            "decoded_payload": {
                "field1": 21.700000000000003,
                "field2": 11.209,
                "field3": 4.129808,
                "field4": 171
            },
            "rx_metadata": [
                {
                    "gateway_ids": {
                        "gateway_id": "eui-a84041ffff2657ac",
                        "eui": "A84041FFFF2657AC"
                    },
                    "time": now_str,
                    "timestamp": now_ts,
                    "rssi": -116,
                    "channel_rssi": -116,
                    "snr": -10.2,
                    "frequency_offset": "-2631",
                    "uplink_token": "CiIKIAoUZXVpLWE4NDA0MWZmZmYyNjU3YWMSCKhAQf//JlesEN2wr90DGgwItNnMxAYQiqfh2gMgyNaUupHzigE=",
                    "channel_index": 6,
                    "received_at": now_str
                }
            ],
            "settings": {
                "data_rate": {
                    "lora": {
                        "bandwidth": 125000,
                        "spreading_factor": 10,
                        "coding_rate": "4/5"
                    }
                },
                "frequency": "867700000",
                "timestamp": now_ts,
                "time": now_str
            },
            "received_at": now_str,
            "consumed_airtime": "0.370688s",
            "packet_error_rate": 0.09090909,
            "network_ids": {
                "net_id": "000013",
                "ns_id": "EC656E0000000181",
                "tenant_id": "ttn",
                "cluster_id": "eu1",
                "cluster_address": "eu1.cloud.thethings.network"
            }
        }
    }

    headers = {
        "Authorization": f"Bearer {TTN_API_KEY}",
        "Content-Type": "application/json"
    }

    print(f"Simulating TTN uplink for device {TTN_DEVICE_ID}")
    resp = requests.post(TTN_SIMULATE_URL, headers=headers, json=payload)
    print(f"TTN simulation response status: {resp.status_code}")

    if resp.status_code != 200:
        print(f"Failed to simulate TTN uplink: {resp.text}")
        return False

    # Wait for data ingestion
    #time.sleep(10)
    return True



# ----------- RUN UDP TEST -----------

try:
    send_udp_packet()
except Exception as e:
    print(f"⚠️ UDP sending failed: {e}")

# ----------- RUN TTN TEST -----------

try:
    simulate_ttn_uplink()
except Exception as e:
    print(f"⚠️ TTN ending failed: {e}")

