import time
import hashlib
import hmac
import base64
import json
import random
import re
from urllib.parse import unquote

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    import urllib.request
    import urllib.error
    HAS_REQUESTS = False

SECRET_KEY_DEFAULT = "76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O"
CERT_SHA256 = "03d4b741632d136bc23e2de4c6adcdb7712f1980b619c183221801730bbd0410"

CLIENT_INFO = json.dumps({
    "package_name": "com.community.mbox.in",
    "version_name": "4.0.03.1013.indus",
    "version_code": 50020132,
    "os": "android",
    "os_version": "9",
    "install_ch": "ps",
    "device_id": "1234567890abcdef1234567890abcdef",
    "install_store": "gs",
    "gaid": "12345678-1234-1234-1234-1234567890ab",
    "brand": "Redmi",
    "model": "23078RKD5C",
    "system_language": "en",
    "net": "NETWORK_WIFI",
    "region": "NL",
    "sp_code":"204",
    "timezone": "Europe/Istanbul",
    "X-Play-Mode": "2"
}, separators=(',', ':'))

USER_AGENT = "com.community.mbox.in/50020132 (Linux; U; Android 9; en_US; 23078RKD5C; Build/PQ3A.190605.03081104; Cronet/135.0.7012.3)"
AUTH_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjIwOTA0ODg0NTg2MzU1MzU4MDgsImV4cCI6MTgwMzA5NTMzMiwiaWF0IjoxNzk1MzE5MDMyfQ._xJ3MVI7pyxz3opkKATkcYQp6BX_-9WEiw3UuPJuiCs"


def md5_hex(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()


def b64_decode(value: str) -> bytes:
    padding = (4 - len(value) % 4) % 4
    return base64.b64decode(value + "=" * padding)


def b64_encode(data: bytes) -> str:
    return base64.b64encode(data).decode('utf-8')


def gen_client_build() -> str:
    ms = int(time.time() * 1000)
    sec = ms // 1000
    usec = (ms % 1000) * 1000
    r = random.randint(0, 999)
    body = f"{sec}{usec:06d}{r}"
    digest = md5_hex((CERT_SHA256 + "oneroom" + body).encode('utf-8'))
    return f"{body}.{digest}"


def build_canonical_string(method: str, accept: str, content_type: str, url: str, body: str, ts: int) -> str:
    url_parts = url.split("?", 1)

    path_match = re.search(r'https?://[^/]+(/.*)', url_parts[0])
    path = path_match.group(1) if path_match else url_parts[0]

    entries = []
    if len(url_parts) > 1:
        for p in url_parts[1].split("&"):
            if not p:
                continue
            if "=" in p:
                key, val = p.split("=", 1)
            else:
                key, val = p, ""
            val = unquote(val.replace("+", " "))
            entries.append((key, val))
        entries.sort(key=lambda x: x[0])

    qs = "&".join(f"{k}={v}" for k, v in entries)
    cu = f"{path}?{qs}" if qs else path

    b_str = body or ""
    bh = ""
    bl = ""
    if len(b_str) > 0:
        b_bytes = b_str.encode('utf-8')
        bh = md5_hex(b_bytes[:102400])
        bl = str(len(b_bytes))

    return f"{method.upper()}\n{accept or ''}\n{content_type or ''}\n{bl}\n{ts}\n{bh}\n{cu}"


def generate_x_tr_signature(method: str, accept: str, content_type: str, url: str, body: str, ts: int) -> str:
    canonical = build_canonical_string(method, accept, content_type, url, body, ts)
    secret_bytes = b64_decode(SECRET_KEY_DEFAULT)
    mac = hmac.new(secret_bytes, canonical.encode('utf-8'), hashlib.md5)
    return f"{ts}|2|{b64_encode(mac.digest())}"


def read_body() -> str:
    print("Enter JSON Body for POST request.")
    print("(Paste your payload and hit DOUBLE ENTER when done):")
    lines = []
    while True:
        try:
            line = input()
            if line == "":
                break
            lines.append(line)
        except EOFError:
            break
    return "\n".join(lines).strip()


def main():
    print("=" * 50)
    print("🎬 MOVIEBOX URL TESTER (GET/POST) 🎬")
    print("=" * 50)

    url = input("Enter Full API URL:\n> ").strip()
    if not url:
        print("❌ URL is required.")
        return

    method = input("Enter Method (GET/POST) [Default: GET]:\n> ").strip().upper()
    if method not in ["GET", "POST"]:
        method = "GET"

    final_body = None
    if method == "POST":
        raw_body = read_body()
        if raw_body:
            try:
                final_body = json.dumps(json.loads(raw_body), separators=(',', ':'))
            except json.JSONDecodeError as e:
                print(f"❌ JSON syntax error: {e}")
                return

    accept = "application/json"
    content_type = "application/json; charset=utf-8"
    ts = int(time.time() * 1000)

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": accept,
        "x-client-build": gen_client_build(),
        "Content-Type": content_type,
        "Connection": "keep-alive",
        "X-Client-Info": CLIENT_INFO,
        "Authorization": AUTH_TOKEN,
        "x-tr-signature": generate_x_tr_signature(method, accept, content_type, url, final_body or "", ts),
        "X-Client-Status": "1",
    }

    print("\n" + "-" * 50)
    print(f"🚀 Sending {method} Request to: {url}")
    print(f"🔑 X-Client-Build: {headers['x-client-build']}")
    print(f"🔑 x-tr-signature: {headers['x-tr-signature']}")
    if final_body:
        print(f"📦 Payload: {final_body}")
    print("-" * 50)

    try:
        if HAS_REQUESTS:
            if method == "GET":
                response = requests.get(url, headers=headers)
            else:
                payload = final_body.encode("utf-8") if final_body else None
                response = requests.post(url, headers=headers, data=payload)
            status_code = response.status_code
            resp_text = response.text
        else:
            payload = (final_body.encode("utf-8") if final_body else None) if method == "POST" else None
            req = urllib.request.Request(url, data=payload, headers=headers, method=method)
            with urllib.request.urlopen(req) as resp:
                status_code = resp.status
                resp_text = resp.read().decode('utf-8')

        print(f"Status Code: {status_code}\n")
        try:
            data = json.loads(resp_text)
            print("✅ Response Data:\n")
            print(json.dumps(data, indent=4))
        except Exception:
            print(resp_text)

    except Exception as e:
        print("❌ Error occurred:")
        print(e)


if __name__ == "__main__":
    main()