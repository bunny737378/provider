function handleMeta(req) {
    let cid = req.id || "";
    let ctype = req.type || "tv";

    if (!cid) return {};

    try {
        let headersStr = JSON.stringify(HEADERS);
        let resp = Network.get(API + "/anime/" + encodeURIComponent(cid), headersStr);
        let json = JSON.parse(JSON.parse(resp).body || "{}");
        let data = json.data || {};

        if (!data || (!data.id && !data.titleEnglish && !data.titleRomaji)) {
            return {};
        }

        let slugId = data.id || cid;
        let bg = data.banner || data.cover || data.image || "";
        let tags = [];

        if (data.rating) tags.push("rating: " + data.rating);
        if (data.status) tags.push(data.status);
        if (data.season) tags.push(data.season);
        if (data.seasonYear) tags.push(String(data.seasonYear));
        if (Array.isArray(data.genres)) {
            data.genres.forEach(function(g) {
                if (g) tags.push(g);
            });
        }

        let plot = data.description || "";
        let actors = [];
        if (Array.isArray(data.characters)) {
            data.characters.forEach(function(c) {
                let name = c.name || (c.voiceActor && c.voiceActor.name) || "";
                let role = c.role || "";
                let img = c.image || (c.voiceActor && c.voiceActor.image) || "";
                if (name) {
                    actors.push({
                        name: name,
                        role: role,
                        Img: img
                    });
                }
            });
        }

        let recommend = [];
        if (Array.isArray(data.recommendations)) {
            data.recommendations.forEach(function(r) {
                let t = r.title || {};
                let title = t.english || t.romaji || t.userPreferred || r.name || "";
                let img = r.image || r.cover || "";
                let recId = String(r.id || r.slug || "");
                if (recId && title) {
                    recommend.push({
                        titel: title,
                        Img: img,
                        id: recId,
                        Type: (r.type || "").toLowerCase() === "movie" ? "movie" : "tv"
                    });
                }
            });
        }

        return {
            basic: {
                Id: slugId,
                Type: ctype,
                Bg: bg,
                Tags: tags,
                Plot: plot
            },
            actors: actors,
            recommend: recommend
        };
    } catch (e) {
        return {};
    }
}
