function parseMedia(u, type, headers) {
    let q = [], a = [];

    try {
        let r = Network.get(u, JSON.stringify(headers));
        let t = JSON.parse(r).body || "";
        type = (type || "").toLowerCase();

        if (type === "mpd" || type === "dash" || /\.mpd(?:\?|$)/i.test(u)) {
            (t.match(/<Representation\b[^>]*>/gi) || []).forEach(x => {
                let mime = (x.match(/\bmimeType="([^"]+)"/i) || [])[1] || "";
                let codecs = (x.match(/\bcodecs="([^"]+)"/i) || [])[1] || "";
                let height = (x.match(/\bheight="(\d+)"/i) || [])[1];

                if (
                    (/video/i.test(mime) ||
                    /^(avc|hev|hvc|vp8|vp9|av01)/i.test(codecs)) &&
                    height &&
                    !q.includes(height + "p")
                ) {
                    q.push(height + "p");
                }
            });

            (t.match(/<AdaptationSet\b[\s\S]*?(?=<AdaptationSet\b|<\/Period>)/gi) || [])
                .forEach(x => {
                    let contentType = (x.match(/\bcontentType="([^"]+)"/i) || [])[1] || "";
                    let mimeType = (x.match(/\bmimeType="([^"]+)"/i) || [])[1] || "";
                    let lang = (x.match(/\blang="([^"]+)"/i) || [])[1] || "";

                    if (
                        lang &&
                        (/audio/i.test(contentType) || /audio/i.test(mimeType)) &&
                        !a.includes(lang)
                    ) {
                        a.push(lang);
                    }
                });

            if (!a.length) {
                (t.match(/\blang="([^"]+)"/gi) || []).forEach(x => {
                    let lang = (x.match(/"([^"]+)"/) || [])[1];

                    if (lang && !a.includes(lang))
                        a.push(lang);
                });
            }
        } else {
            t.split(/\r?\n/).forEach(x => {
                if (x.startsWith("#EXT-X-STREAM-INF:")) {
                    let m = x.match(/RESOLUTION=\d+x(\d+)/i);

                    if (m && !q.includes(m[1] + "p"))
                        q.push(m[1] + "p");
                }

                if (x.startsWith("#EXT-X-MEDIA:")) {
                    let mediaType = (x.match(/TYPE=([^,]+)/i) || [])[1] || "";
                    let lang = (x.match(/LANGUAGE="([^"]*)"/i) || [])[1] || "";

                    if (
                        mediaType.toUpperCase() === "AUDIO" &&
                        lang &&
                        !a.includes(lang)
                    ) {
                        a.push(lang);
                    }
                }
            });
        }

        q.sort((x, y) => parseInt(x) - parseInt(y));
    } catch (e) {}

    return { q, a };
}

function getData(req) {
    let p = (req.id || "").split("--");
    let f = p[0]?.split("-");

    if (p.length !== 2 || f.length !== 3)
        return [];

    let [sid, se, ep] = f;

    let play = callApi(
        API + "/play-info?subjectId=" + sid +
        "&se=" + parseInt(se) +
        "&ep=" + parseInt(ep),
        "GET"
    );

    if (!play?.data?.streams?.length)
        return [];

    let streams = play.data.streams;
    let first = streams[0];
    let subs = [];

    if (first?.id) {
        let c = callApi(
            API + "/get-stream-captions?subjectId=" + sid +
            "&streamId=" + first.id,
            "GET"
        );

        if (!c?.data?.extCaptions?.length) {
            c = callApi(
                API_RES + "/get-ext-captions?subjectId=" + sid +
                "&resourceId=" + first.id,
                "GET"
            );
        }

        if (c?.data?.extCaptions) {
            subs = c.data.extCaptions.map(x => ({
                label: x.lan || "",
                url: x.url || ""
            }));
        }
    }

    return streams.map((s, i) => {
        let headers = {};

        if (REFER)
            headers.Referer = REFER;

        if (s.signCookie)
            headers.Cookie = s.signCookie;

        let type = (s.format || "m3u8").toLowerCase();
        let media = parseMedia(s.url || "", type, headers);

        return {
            id: i + 1,
            type,
            url: s.url || "",
            headers,
            qualities: media.q,
            audios: media.a,
            subtitles: {
                embedded: [],
                external: subs
            }
        };
    });
}

function handleStreams(req) {
    return getData(req);
}

function handleDownload(req) {
    return getData(req);
}