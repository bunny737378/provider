const C_KEY = "10b06cdc1ca48c9fb0b94af97cc040cf";
const V_HOSTS = ["https://cdnx.aniwatchtv.site"];
let S_IDX = 0;

function strToUtf8(str) {
    if (typeof TextEncoder !== "undefined") {
        return new TextEncoder().encode(str);
    }
    let utf8 = [];
    for (let i = 0; i < str.length; i++) {
        let charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
            utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
        } else if (charcode < 0xd800 || charcode >= 0xe000) {
            utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
        } else {
            i++;
            charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
            utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
        }
    }
    return new Uint8Array(utf8);
}

function bytesToBase64Str(bytes) {
    if (typeof Base64 !== "undefined" && Base64.encode) {
        let raw = "";
        for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);
        return Base64.encode(raw);
    }
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let output = "";
    let len = bytes.length;
    for (let i = 0; i < len; i += 3) {
        let b0 = bytes[i];
        let b1 = i + 1 < len ? bytes[i + 1] : 0;
        let b2 = i + 2 < len ? bytes[i + 2] : 0;
        output += chars[b0 >> 2];
        output += chars[((b0 & 3) << 4) | (b1 >> 4)];
        output += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : "=";
        output += i + 2 < len ? chars[b2 & 63] : "=";
    }
    return output;
}

function encodeUwU(targetUrl, origin) {
    let tBytes = strToUtf8(targetUrl);
    let oBytes = strToUtf8(origin);
    let combined = new Uint8Array(tBytes.length + 1 + oBytes.length);
    for (let i = 0; i < tBytes.length; i++) combined[i] = tBytes[i];
    combined[tBytes.length] = 0;
    for (let i = 0; i < oBytes.length; i++) combined[tBytes.length + 1 + i] = oBytes[i];
    for (let i = 0; i < combined.length; i++) {
        combined[i] ^= C_KEY.charCodeAt(i % C_KEY.length);
    }
    let b64 = bytesToBase64Str(combined).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    let host = V_HOSTS[S_IDX % V_HOSTS.length];
    S_IDX++;
    return host + "/uwu/" + b64;
}

const PROVIDER_ORIGINS = {
    yuki: "https://megaplay.buzz",
    sora: "https://krussdomi.com",
    uwu: "https://kwik.cx/",
    kiwi: "https://anidb.app/",
    miku: "https://allanime.uns.bio"
};

function transformSourceUrl(url, providerId) {
    let p = (providerId || "").toLowerCase();
    let origin = PROVIDER_ORIGINS[p] || "https://megaplay.buzz";
    return encodeUwU(url, origin);
}

function handleStreams(req) {
    let i = req.id || "";
    if (!i) return [];

    let headersStr = JSON.stringify(HEADERS);
    let out = [];

    let lastDash = i.lastIndexOf("-");
    let slug = lastDash > 0 ? i.slice(0, lastDash) : i;
    let epNum = lastDash > 0 ? i.slice(lastDash + 1) : "1";

    try {
        let srvResp = Network.get(CHAD_API + "/servers?id=" + encodeURIComponent(slug) + "&epNum=" + epNum, headersStr);
        let srvJson = JSON.parse(JSON.parse(srvResp).body || "{}");
        let subProviders = srvJson.subProviders || [];
        let dubProviders = srvJson.dubProviders || [];

        function processProvider(prov, type) {
            let pid = typeof prov === "string" ? prov : (prov.id || "");
            if (!pid) return;

            let tip = typeof prov === "object" && prov.tip ? " (" + prov.tip.split(",")[0] + ")" : "";
            let sUrl = CHAD_API + "/sources?id=" + encodeURIComponent(slug) + "&epNum=" + epNum + "&type=" + type + "&providerId=" + pid;
            try {
                let srcResp = Network.get(sUrl, headersStr);
                let srcJson = JSON.parse(JSON.parse(srcResp).body || "{}");
                let data = srcJson.data || srcJson;
                let sources = data.sources || [];
                let tracks = data.tracks || data.subtitles || [];

                let extSubs = [];
                tracks.forEach(function(t) {
                    if (t.url && t.kind !== "thumbnails") {
                        let subUrl = t.url;
                        if (pid === "yuki" || pid === "sora" || pid === "uwu" || pid === "kiwi") {
                            subUrl = transformSourceUrl(t.url, pid);
                        }
                        extSubs.push({
                            label: t.label || t.lang || "Subtitles",
                            url: subUrl
                        });
                    }
                });

                sources.forEach(function(src) {
                    let directUrl = src.url;
                    let playableUrl = directUrl;
                    if (pid === "yuki" || pid === "sora" || pid === "uwu" || pid === "kiwi") {
                        playableUrl = transformSourceUrl(directUrl, pid);
                    }

                    out.push({
                        nm: "AniDap " + pid.toUpperCase() + " [" + type.toUpperCase() + "]" + tip,
                        type: "m3u8",
                        url: playableUrl,
                        headers: {
                            "Referer": "https://anidap.lol/home",
                            "Origin": "https://anidap.lol",
                            "User-Agent": "Mozilla/5.0"
                        },
                        qualities: [src.quality || "auto"],
                        audios: [type === "dub" ? "English Dub" : "Japanese Sub"],
                        subtitles: {
                            embedded: [],
                            external: extSubs
                        }
                    });
                });
            } catch (err) {}
        }

        subProviders.forEach(function(p) { processProvider(p, "sub"); });
        dubProviders.forEach(function(p) { processProvider(p, "dub"); });

        return out;
    } catch (e) {
        return [];
    }
}
