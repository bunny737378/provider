function handleStreams(req) {
    let i = req.id || "", mt = req.type || "";
    let headers = { Origin: URL, Referer: URL + "/" };

    function parse(u) {
        let r = { q: [], a: [], s: [] };

        try {
            let t = JSON.parse(Network.get(u, JSON.stringify(headers))).body || "";

            t.split(/\r?\n/).forEach(x => {
                if (x.startsWith("#EXT-X-STREAM-INF:")) {
                    let m = x.match(/RESOLUTION=\d+x(\d+)/i);
                    if (m && !r.q.includes(m[1] + "p"))
                        r.q.push(m[1] + "p");
                }

                if (x.startsWith("#EXT-X-MEDIA:")) {
                    let type = (x.match(/TYPE=([^,]+)/i) || [])[1] || "";
                    let l = (x.match(/LANGUAGE="([^"]*)"/i) || [])[1] || "";

                    if (l) {
                        if (type === "AUDIO" && !r.a.includes(l))
                            r.a.push(l);

                        if (type === "SUBTITLES" && !r.s.includes(l))
                            r.s.push(l);
                    }
                }
            });
        } catch (e) {}

        return r;
    }

    function out(u) {
        if (!u) return [];

        let p = parse(u);

        return [{
            id: 1,
            type: "m3u8",
            url: u,
            headers: headers,
            qualities: p.q,
            audios: p.a,
            subtitles: {
                embedded: p.s,
                external: []
            }
        }];
    }

    try {
        if (mt === "movie") {
            let b = JSON.parse(Network.get(
                URL + "/detail/movie/" + i,
                JSON.stringify(headers)
            )).body || "";

            let m = b.match(
                /"duration":"PT[\w]+".*?"@type":"VideoObject","contentUrl":"(https?:\/\/[^"]+\.m3u8)"/s
            );

            return m ? out(m[1]) : [];
        }

        let p = i.split("-");
        if (p.length !== 2) return [];

        let sid = p[0], ep = parseInt(p[1]);
        let u = API + "/detail/tab/tvshowepisodes?type=season&id=" + sid, n = 1;

        while (u) {
            try {
                let b = JSON.parse(JSON.parse(
                    Network.get(u, JSON.stringify(headers))
                ).body || "{}");

                let items = b.items || [];
                if (!items.length) break;

                for (let e of items) {
                    if (n++ === ep) {
                        let h = ((e.stream || {}).hls || {}).high || "";
                        return out(h ? CDN + h : "");
                    }
                }

                u = b.next
                    ? API + "/detail/tab/tvshowepisodes?type=season&" + b.next + "&id=" + sid
                    : null;
            } catch (e) {
                break;
            }
        }

        return [];
    } catch (e) {
        return [];
    }
}