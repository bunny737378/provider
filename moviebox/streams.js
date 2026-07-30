// ============================================
// STREAM HANDLER
// ============================================
function handleStreams(req) {
    let p = (req.id || "").split("--");
    if (p.length != 2) return [];

    let f = p[0].split("-");
    if (f.length != 3) return [];

    let sid = f[0], se = parseInt(f[1]), ep = parseInt(f[2]);

    let play = callApi(API + "/play-info?subjectId=" + sid + "&se=" + se + "&ep=" + ep, "GET");

    let subs = [], id = null;

    if (play && play.code == 0 && play.data && play.data.streams) {
        if (play.data.streams.length) id = play.data.streams[0].id;
    }

    if (id) {
        let c = callApi(API + "/get-stream-captions?subjectId=" + sid + "&streamId=" + id, "GET");

        if (c && c.code == 0 && c.data && c.data.extCaptions)
            c.data.extCaptions.forEach(x => subs.push({ name: x.lan || "", link: x.url || "" }));

        if (!subs.length) {
            c = callApi(API_RES + "/get-ext-captions?subjectId=" + sid + "&resourceId=" + id, "GET");
            if (c && c.code == 0 && c.data && c.data.extCaptions)
                c.data.extCaptions.forEach(x => subs.push({ name: x.lan || "", link: x.url || "" }));
        }
    }

    let out = [];

    if (play && play.code == 0 && play.data && play.data.streams) {
        play.data.streams.forEach(s => {
            out.push({
                nm: (s.resolutions || "") + " [" + (s.format || "UNKNOWN") + "]",
                Url: s.url || "",
                refer: REFER,
                Header: s.signCookie ? [{
                    name: "Cookie",
                    value: s.signCookie
                }] : [],
                Subtitle: subs
            });
        });
    }

    return out;
}

// ============================================
// DOWNLOAD HANDLER - ALAG CLASS
// ============================================
function handleDownload(req) {
    let p = (req.id || "").split("--");
    if (p.length != 2) return [];

    let f = p[0].split("-");
    if (f.length != 3) return [];

    let sid = f[0], se = parseInt(f[1]), ep = parseInt(f[2]);

    let play = callApi(API + "/play-info?subjectId=" + sid + "&se=" + se + "&ep=" + ep, "GET");

    let subs = [], id = null;

    if (play && play.code == 0 && play.data && play.data.streams) {
        if (play.data.streams.length) id = play.data.streams[0].id;
    }

    if (id) {
        let c = callApi(API + "/get-stream-captions?subjectId=" + sid + "&streamId=" + id, "GET");

        if (c && c.code == 0 && c.data && c.data.extCaptions)
            c.data.extCaptions.forEach(x => subs.push({ name: x.lan || "", link: x.url || "" }));

        if (!subs.length) {
            c = callApi(API_RES + "/get-ext-captions?subjectId=" + sid + "&resourceId=" + id, "GET");
            if (c && c.code == 0 && c.data && c.data.extCaptions)
                c.data.extCaptions.forEach(x => subs.push({ name: x.lan || "", link: x.url || "" }));
        }
    }

    let out = [];

    if (play && play.code == 0 && play.data && play.data.streams) {
        play.data.streams.forEach(s => {
            out.push({
                Type: "2",
                nm: (s.resolutions || "") + " [DOWNLOAD]",
                Url: s.url || "",
                refer: REFER,
                Header: s.signCookie ? [{
                    name: "Cookie",
                    value: s.signCookie
                }] : [],
                Subtitle: subs
            });
        });
    }

    return out;
}