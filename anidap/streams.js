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
                let apiHeaders = data.headers || srcJson.headers || {};

                // Dynamically extract Referer & Origin from the streaming API response
                let dynamicReferer = apiHeaders.Referer || apiHeaders.referer || "";
                if (!dynamicReferer) {
                    dynamicReferer = "https://anidap.lol/home";
                }

                let dynamicOrigin = apiHeaders.Origin || apiHeaders.origin || "";
                if (!dynamicOrigin && dynamicReferer) {
                    let m = dynamicReferer.match(/^(https?:\/\/[^\/]+)/i);
                    dynamicOrigin = m ? m[1] : dynamicReferer;
                }

                let streamHeaders = {
                    "Referer": dynamicReferer,
                    "Origin": dynamicOrigin
                };
                if (apiHeaders["User-Agent"] || apiHeaders["user-agent"]) {
                    streamHeaders["User-Agent"] = apiHeaders["User-Agent"] || apiHeaders["user-agent"];
                }

                let extSubs = [];
                tracks.forEach(function(t) {
                    if (t.url && t.kind !== "thumbnails") {
                        extSubs.push({
                            label: t.label || t.lang || "Subtitles",
                            url: t.url
                        });
                    }
                });

                sources.forEach(function(src) {
                    if (!src.url) return;
                    out.push({
                        nm: "AniDap " + pid.toUpperCase() + " [" + type.toUpperCase() + "]" + tip,
                        type: "m3u8",
                        url: src.url,
                        headers: streamHeaders,
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
