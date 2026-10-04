function handleStreams(req) {
let i = req.id || "", mt = req.type || "";
let headers = { Origin: URL, Referer: URL + "/" };
let mp4Headers = { "Accept-Encoding": "identity" };

function m3u8(u) {
    let q = [], a = [], s = [];

    try {
        let t = JSON.parse(Network.get(u, JSON.stringify(headers))).body || "";

        t.split(/\r?\n/).forEach(x => {
            if (x.startsWith("#EXT-X-STREAM-INF:")) {
                let m = x.match(/RESOLUTION=\d+x(\d+)/i);
                if (m && !q.includes(m[1] + "p")) q.push(m[1] + "p");
            }

            if (x.startsWith("#EXT-X-MEDIA:")) {
                let type = (x.match(/TYPE=([^,]+)/i) || [])[1] || "";
                let lang = (x.match(/LANGUAGE="([^"]*)"/i) || [])[1] || "";

                if (lang && type === "AUDIO" && !a.includes(lang)) a.push(lang);
                if (lang && type === "SUBTITLES" && !s.includes(lang)) s.push(lang);
            }
        });
    } catch (e) {}

    return {
        qualities: q,
        audios: a,
        subtitles: { embedded: s, external: [] }
    };
}

function dash(u) {
    let videos = [], audios = [];

    try {
        let x = JSON.parse(Network.get(u, JSON.stringify(headers))).body || "";
        let sets = /<AdaptationSet\b([^>]*)>([\s\S]*?)<\/AdaptationSet>/gi, m;

        while ((m = sets.exec(x))) {
            let attrs = m[1], body = m[2];

            if (/contentType=["']audio["']/i.test(attrs)) {
                let l = (attrs.match(/\blang=["']([^"']+)["']/i) || [])[1] || "";
                if (l && !audios.includes(l)) audios.push(l);
                continue;
            }

            if (!/contentType=["']video["']/i.test(attrs)) continue;

            let reps = /<Representation\b([^>]*)>([\s\S]*?)<\/Representation>/gi, r;

            while ((r = reps.exec(body))) {
                let h = (r[1].match(/\bheight=["'](\d+)["']/i) || [])[1] || "";
                let init = (r[2].match(/<SegmentTemplate\b[^>]*initialization=["']([^"']+)["']/i) || [])[1] || "";
                if (!init) continue;

                let file = init.split("/").pop();
                let base = u.replace(/\/dash\/[^/?#]+(?:[?#].*)?$/i, "/mxv_download/");

                videos.push({
                    url: base + file,
                    quality: h ? h + "p" : ""
                });
            }
        }
    } catch (e) {}

    return { videos: videos, audios: audios };
}

function out(hls, mpd) {
    let out = [];

    if (hls) {
        let p = m3u8(hls);

        out.push({
            id: 1,
            type: "m3u8",
            url: hls,
            headers: headers,
            qualities: p.qualities,
            audios: p.audios,
            subtitles: p.subtitles
        });
    }

    if (mpd) {
        let d = dash(mpd);

        d.videos.forEach(v => {
            out.push({
                id: out.length + 1,
                type: "mkv",
                url: v.url,
                headers: mp4Headers,
                qualities: v.quality ? [v.quality] : [],
                audios: d.audios,
                subtitles: {
                    embedded: [],
                    external: []
                }
            });
        });
    }

    return out;
}

try {
    if (mt === "movie") {
        let b = JSON.parse(
            Network.get(
                URL + "/detail/movie/" + i,
                JSON.stringify(headers)
            )
        ).body || "";

        let hls = (b.match(
            /"contentUrl":"(https?:\/\/[^"]+\.m3u8)"/i
        ) || [])[1] || "";

        let mpd = (b.match(
            /"dash"\s*:\s*\{\s*"high"\s*:\s*"([^"]+\.mpd)"/i
        ) || [])[1] || "";

        return out(hls, mpd ? CDN + mpd : "");
    }

    let p = i.split("-");
    if (p.length !== 2) return [];

    let sid = p[0], ep = parseInt(p[1]);
    let u = API + "/detail/tab/tvshowepisodes?type=season&id=" + sid;
    let n = 1;

    while (u) {
        try {
            let b = JSON.parse(
                JSON.parse(
                    Network.get(u, JSON.stringify(headers))
                ).body || "{}"
            );

            let items = b.items || [];
            if (!items.length) break;

            for (let e of items) {
                if (n++ === ep) {
                    let s = e.stream || {};
                    let hls = (s.hls || {}).high || "";
                    let mpd = (s.dash || {}).high || "";

                    return out(
                        hls ? CDN + hls : "",
                        mpd ? CDN + mpd : ""
                    );
                }
            }

            u = b.next
                ? API + "/detail/tab/tvshowepisodes?type=season&" +
                  b.next + "&id=" + sid
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