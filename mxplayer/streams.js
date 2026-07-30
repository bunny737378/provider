function handleStreams(req) {
    let i = req.id || "";
    let mt = req.type || "";
    let headers = {"User-Agent":"Mozilla/5.0","origin":URL,"referer":URL + "/"};

    function out(u) {
        return [{
            nm: "Server1",
            Url: u,
            refer: URL,
            Header: [],
            Subtitle: []
        }];
    }

    try {
        if (mt === "movie") {
            let html = JSON.parse(Network.get(URL + "/detail/movie/" + i, JSON.stringify(headers))).body || "";
            let m = html.match(/"duration":"PT[\w]+".*?"@type":"VideoObject","contentUrl":"(https?:\/\/[^"]+\.m3u8)"/s);
            if (!m) return [];
            return out(m[1]);
        }

        let parts = i.split("-");
        if (parts.length !== 2) return [];

        let sid = parts[0];
        let en = parseInt(parts[1]);
        let url = API + "/detail/tab/tvshowepisodes?type=season&id=" + sid;
        let n = 1;

        while (url) {
            try {
                let body = JSON.parse(JSON.parse(Network.get(url, JSON.stringify(headers))).body || "{}");
                let items = body.items || [];
                if (!items.length) break;

                for (let e of items) {
                    if (n === en) {
                        let hls = ((e.stream || {}).hls || {}).high || "";
                        let link = hls ? CDN + hls : "";
                        if (!link) return [];
                        return out(link);
                    }
                    n++;
                }

                url = body.next ? API + "/detail/tab/tvshowepisodes?type=season&" + body.next + "&id=" + sid : null;
            } catch (e) {
                break;
            }
        }

        return [];
    } catch (e) {
        return [];
    }
}