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

        // Format genres as clean strings (never { id, name } objects)
        if (Array.isArray(data.genres)) {
            data.genres.forEach(function(g) {
                if (!g) return;
                let name = typeof g === "object" ? (g.name || g.tag || g.title || "") : String(g);
                if (name && tags.indexOf(name) === -1) {
                    tags.push(name);
                }
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

        // Recommendations & Relations formatted into MOVIEAPPP MediaItem objects
        let recommend = [];
        let recList = (data.recommendations && Array.isArray(data.recommendations)) ? data.recommendations : [];
        let relList = (data.relations && Array.isArray(data.relations)) ? data.relations : [];
        let combinedRec = recList.concat(relList);

        combinedRec.forEach(function(r) {
            if (!r) return;
            let title = r.englishTitle || r.romajiTitle || "";
            if (!title && r.title) {
                title = typeof r.title === "object" ? (r.title.english || r.title.romaji || r.title.userPreferred || "") : String(r.title);
            }
            if (!title && r.name) title = r.name;

            let img = "";
            if (r.coverImage) {
                img = typeof r.coverImage === "string" ? r.coverImage : (r.coverImage.large || r.coverImage.extraLarge || "");
            }
            if (!img && r.coverImages) {
                img = typeof r.coverImages === "string" ? r.coverImages : (r.coverImages.large || r.coverImages.extraLarge || "");
            }
            if (!img) img = r.image || r.cover || "";

            let recId = String(r.id || r.sourceId || r.slug || r.anilistId || "");
            let recType = (r.format || r.type || "tv").toLowerCase() === "movie" ? "movie" : "tv";

            if (recId && title) {
                let exists = false;
                for (let k = 0; k < recommend.length; k++) {
                    if (recommend[k].id === recId) {
                        exists = true;
                        break;
                    }
                }
                if (!exists) {
                    recommend.push({
                        titel: title,
                        Img: img,
                        id: recId,
                        Type: recType
                    });
                }
            }
        });

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
