const S = "76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O";
const C = JSON.stringify({
    "package_name": "com.community.oneroom",
    "version_name": "5.0.02.0831.05",
    "version_code": 50020130,
    "os": "android",
    "os_version": "9",
    "install_ch": "ps",
    "device_id": "1234567890abcdef1234567890abcdef",
    "install_store": "ps",
    "gaid": "12345678-1234-1234-1234-1234567890ab",
    "brand": "Redmi",
    "model": "23078RKD5C",
    "system_language": "en",
    "net": "NETWORK_WIFI",
    "region": "US",
    "timezone": "America/New_York",
    "sp_code": "40401",
    "X-Play-Mode": "2"
});
const U = "com.community.oneroom/50020042 (Linux; U; Android 9; en_US; 23078RKD5C; Build/PQ3A.190605.03081104; Cronet/135.0.7012.3)";
const A = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjM1MDg3NDY3ODE4MDA2ODUzNjgsImV4cCI6MTc5MDI1NzU5NiwiaWF0IjoxNzgyNDgxMjk2fQ.5N-lc6Yhk3R4TxglIFZ_kXVZJ2ahQUmzz_jmmMMbqBA";

const API = "https://apii.inmoviebox.com/wefeed-mobile-bff/subject-api";
const API_HOME = "https://apii.inmoviebox.com/wefeed-mobile-bff";
const API_RES = "https://apii.inmoviebox.com/wefeed-mobile-bff/subject-api/resource";
const REFER = "https://apii.inmoviebox.com";

function genToken(ts) {
    let t = ts.toString();
    let rev = t.split('').reverse().join('');
    return t + "," + Crypto.md5Hex(rev);
}

function getByteLength(str) {
    let s = str.length;
    for (let i = str.length - 1; i >= 0; i--) {
        let code = str.charCodeAt(i);
        if (code > 0x7f && code <= 0x7ff) s++;
        else if (code > 0x7ff && code <= 0xffff) s += 2;
        if (code >= 0xDC00 && code <= 0xDFFF) i--;
    }
    return s;
}

function genContext(m, a, ct, u, b, ts) {
    let urlParts = u.split("?");

    let pathMatch = urlParts[0].match(/https?:\/\/[^\/]+(\/.*)/);
    let path = pathMatch ? pathMatch[1] : urlParts[0];

    let entries = [];

    if (urlParts.length > 1) {
        let params = urlParts[1].split("&");

        params.forEach(function(p) {
            let idx = p.indexOf("=");

            let key = idx === -1 ? p : p.substring(0, idx);
            let value = idx === -1 ? "" : p.substring(idx + 1);

            value = decodeURIComponent(value.replace(/\+/g, " "));

            entries.push([key, value]);
        });

        entries.sort(function(a, b) {
            return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
        });
    }

    let qs = entries.map(function(e) {
        return e[0] + "=" + e[1];
    }).join("&");

    let cu = qs ? path + "?" + qs : path;

    let bStr = b || "";
    let bh = "";
    let bl = "";

    if (bStr.length > 0) {
        bh = Crypto.md5Hex(bStr.substring(0, 102400));
        bl = getByteLength(bStr).toString();
    }

    return m.toUpperCase() + "\n" +
           (a || "") + "\n" +
           (ct || "") + "\n" +
           bl + "\n" +
           ts + "\n" +
           bh + "\n" +
           cu;
}

function genSignature(m, a, ct, u, b, ts) {
    let ctx = genContext(m, a, ct, u, b, ts);
    let hmacBase64 = Crypto.hmacMd5Base64(ctx, S);
    return ts + "|2|" + hmacBase64;
}

function callApi(u, method, bodyStr) {
    let m = (method || "GET").toUpperCase();
    let ts = new Date().getTime();
    let b = bodyStr || "";
    
    let headers = {
        "User-Agent": U,
        "Accept": "application/json",
        "X-Client-Build": "1790144723381916466.632cf3fe507b339bc757f117f85b4c4a",
        "Content-Type": "application/json; charset=utf-8",
        "X-Client-Token": genToken(ts),
        "x-tr-signature": genSignature(m, "application/json", "application/json; charset=utf-8", u, b, ts),
        "X-Client-Info": C,
        "X-Client-Status": "1",
        "Authorization": A
    };
    
    try {
        let respStr = m === "POST" 
            ? Network.post(u, JSON.stringify(headers), b)
            : Network.get(u, JSON.stringify(headers));
        
        let bridgeResp = JSON.parse(respStr);
        if (bridgeResp.code && bridgeResp.code !== 200) return null;
        return JSON.parse(bridgeResp.body || "{}");
    } catch(e) {
        return null;
    }
}

function handleRequest(reqJsonStr) {
    let req = JSON.parse(reqJsonStr);
    let type = req.request_type;
    let res = {};
    
    try {
        if (type === "catalog") {
            res = CATALOG_DATA;
        } else if (type === "home" || type === "allsearch" || type === "qsearch" || type === "msearch" || type === "tvsearch") {
            res = handleDiscovery(req);
        } else if (type === "meta") {
            res = handleMeta(req);
        } else if (type === "season_info" || type === "season_ep_info") {
            res = handleSeasons(req);
        } else if (type === "stream") {
            res = handleStreams(req);
        } else if (type === "download") {
            res = handleDownload(req);  // ← ALAG CLASS CALL
        } else if (type === "apislist") {
            res = getApisList();
        } else {
            res = {error: "Unknown request_type: " + type};
        }
    } catch (e) {
        res = {error: e.toString()};
    }
    
    return JSON.stringify(res, null, 2);
}

function getApisList() {
    return {
        provider: "moviebox",
        apis: {
            qsearch: true,
            searchtext: [
                {
                    name: "Movie Search",
                    field: "msearch"
                },
                {
                    name: "TV Search",
                    field: "tvsearch"
                }
            ]
        }
    };
}