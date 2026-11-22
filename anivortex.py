import base64, hashlib, json, sys, time, uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urljoin, urlsplit, parse_qsl, quote, unquote

import requests
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID

BASE = "https://api.anivortex.in"
b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
sha = lambda b: hashlib.sha256(b).digest()
enc = lambda s: quote(s, safe="-._~")


def sign(key, text):
    return b64(key.sign(text.encode(), ec.ECDSA(hashes.SHA256())))


def post(session, path, data):
    r = session.post(BASE + path, json=data, timeout=20, allow_redirects=False)
    if not 200 <= r.status_code < 300:
        raise RuntimeError(f"HTTP {r.status_code}: {r.text}")
    return r.json()


def register(session):
    print("Registering...")
    c = post(session, "/api/v1/install/challenge", {
        "platform": "android", "package_name": "app.anivortex.mobile",
        "version_name": "5.0.2", "version_code": 505,
    })
    raw = base64.urlsafe_b64decode(c["challenge"] + "=" * (-len(c["challenge"]) % 4))
    if len(raw) != 32:
        raise ValueError("Invalid challenge length.")

    key = ec.generate_private_key(ec.SECP256R1())
    now = datetime.now(timezone.utc)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "AniVortex Python installation")])
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name)
            .public_key(key.public_key()).serial_number(x509.random_serial_number())
            .not_valid_before(now - timedelta(minutes=5))
            .not_valid_after(now + timedelta(days=365)).sign(key, hashes.SHA256()))
    cert = base64.b64encode(cert.public_bytes(serialization.Encoding.DER)).decode()
    proof = sign(key, "\n".join(["ANIVORTEX-INSTALL-REGISTER-V1", c["challenge_id"], b64(sha(raw))]))

    r = post(session, "/api/v1/install/register", {
        "challenge_id": c["challenge_id"], "certificate_chain": [cert, cert],
        "proof_signature": proof,
    })
    server_time = datetime.fromisoformat(r["server_time"].replace("Z", "+00:00"))
    if server_time.tzinfo is None:
        raise ValueError("Invalid server time.")
    print("Registered.")
    return key, r["installation_id"], r["key_id"], int(server_time.timestamp()) - int(time.time())


def call(session, credentials, method, url, body=None):
    key, iid, kid, offset = credentials
    url = urljoin(BASE + "/", url) if url.startswith("/") else url
    p = urlsplit(url)
    if (p.scheme != "https" or p.hostname != "api.anivortex.in" or
            p.port not in (None, 443) or p.username or p.password or p.fragment):
        raise ValueError("Only api.anivortex.in URLs are allowed.")

    headers = {"Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"

    req = session.prepare_request(requests.Request(method, url, headers=headers, data=body))
    p = urlsplit(req.url)
    path = "/".join(enc(unquote(s, errors="strict")) for s in (p.path or "/").split("/"))
    pairs = sorted((enc(k), enc(v)) for k, v in parse_qsl(p.query, keep_blank_values=True, errors="strict"))
    query = "&".join(f"{k}={v}" for k, v in pairs)
    ts, rid = str(int(time.time()) + offset), str(uuid.uuid4())
    message = "\n".join([
        "ANIVORTEX-SIGNED-REQUEST-V1", iid, kid, ts, rid, method,
        path, query, hashlib.sha256(req.body or b"").hexdigest(),
    ])
    req.headers.update({
        "X-AniVortex-Installation-ID": iid, "X-AniVortex-Key-ID": kid,
        "X-AniVortex-Timestamp": ts, "X-AniVortex-Request-ID": rid,
        "X-AniVortex-Signature": sign(key, message),
    })
    return session.send(req, timeout=20, allow_redirects=False)


def main():
    session = requests.Session()
    credentials = register(session)

    while True:
        url = input("\nURL or path (exit to quit): ").strip()
        if url.lower() in {"exit", "quit"}:
            break
        method = input("Method [GET/POST]: ").strip().upper() or "GET"
        if not url or method not in {"GET", "POST"}:
            print("Invalid URL or method.")
            continue
        try:
            body = None
            if method == "POST":
                text = input("JSON body (blank for none): ").strip()
                if text:
                    body = json.dumps(json.loads(text), ensure_ascii=False, separators=(",", ":")).encode()
            response = call(session, credentials, method, url, body)
            print(f"\nHTTP {response.status_code}")
            try:
                print(json.dumps(response.json(), indent=2, ensure_ascii=False))
            except ValueError:
                print(response.text)
        except (requests.RequestException, ValueError) as e:
            print("Request failed:", e)


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print("\nStopped.")
    except (requests.RequestException, RuntimeError, ValueError, KeyError) as e:
        print("Error:", e, file=sys.stderr)
        
        
        
        
'''



## ✅ Config

```text
Method: GET
Path:   /api/v1/config?platform=android&version=5.0.2
``

## ✅ Search results

```text
Method: GET
Path:   /api/v1/search?q=Naruto&include_adult=false&limit=30
```

## ✅ Search suggestions

```text
Method: GET
Path:   /api/v1/search/suggestions?q=Naruto&include_adult=false&limit=8
```

## ✅ Watch screen data

```text
Method: GET
Path:   /api/v1/titles/<title_id>/watch?include_adult=false
```

## ✅ Playback information

```text
Method: GET
Path:   /api/v1/titles/<title_id>/playback
```
## ✅ Season ke episodes

```text
Method: GET
Path:   /api/v1/seasons/<season_id>/episodes


```text
/api/v1/catalog/home           → Home
/api/v1/catalog/explore        → Explore
/api/v1/catalog/sections       → Catalog sections
/api/v1/catalog/genres         → Genres
/api/v1/catalog/ott-platforms  → OTT platforms
/api/v1/titles                 → Title details base


 "id": 1020,
      "title": "Naruto",
      "original_title": "ナルト",
      "content_type": "anime",
      "release_year": 2002,
      "rating": 8.4,
      "poster_url": "https://m.media-amazon.com/images/M/MV5BZTNjOWI0ZTAtOGY1OS00ZGU0LWEyOWYtMjhkYjdlYmVjMDk2XkEyXkFqcGc@._V1_QL75_UX300_.jpg",
      "backdrop_url": "https://image.tmdb.org/t/p/original/xuJ0F9RfKvVSJNDg2usurQ9WvY5.jpg",
      "audio_badge": null,
      "newly_added": false
      
      
      /api/v1/search?q=alice in&include_adult=false&limit=30
      /api/v1/titles/145/watch?include_adult=true
      /api/v1/seasons/230/episodes
      /api/v1/titles/2495/playback
      
      
      
      '''