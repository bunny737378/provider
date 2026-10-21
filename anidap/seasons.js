function handleSeasons(req) {
    let i = req.id || "";
    let mt = req.type || "tv";
    let rt = req.request_type;

    if (!i) return {};

    try {
        let headersStr = JSON.stringify(HEADERS);

        if (mt === "movie") {
            let eps = [{
                ep_no: 1,
                id: i + "-1",
                title: "Watch Movie",
                img: "",
                plot: "",
                tags: ["Movie"]
            }];
            if (rt === "season_ep_info") return { episodes: eps };
            return {
                seasons: [{
                    season_no: "1",
                    name: "Full Movie",
                    id: [{ name: "Default", id: i }]
                }],
                episodes: eps
            };
        }

        // Determine slug ID
        let slug = i;
        if (/^\d+$/.test(i)) {
            let detailResp = Network.get(API + "/anime/" + encodeURIComponent(i), headersStr);
            let detailJson = JSON.parse(JSON.parse(detailResp).body || "{}");
            if (detailJson.data && detailJson.data.id) {
                slug = detailJson.data.id;
            }
        }

        let epResp = Network.get(CHAD_API + "/episodes?id=" + encodeURIComponent(slug), headersStr);
        let epBodyStr = JSON.parse(epResp).body || "[]";
        let epList = [];
        try {
            let parsed = JSON.parse(epBodyStr);
            if (Array.isArray(parsed)) epList = parsed;
            else if (parsed.data && Array.isArray(parsed.data)) epList = parsed.data;
        } catch (e) {
            epList = [];
        }

        let eps = [];
        epList.forEach(function(e, idx) {
            let epNum = e.number || (idx + 1);
            let epTitle = "";
            if (e.titles) {
                epTitle = e.titles.en || e.titles["x-jat"] || e.titles.ja || e.titles.romaji || "";
            }
            if (!epTitle) epTitle = "Episode " + epNum;

            let tags = [];
            if (e.rating) tags.push("★ " + e.rating);
            if (e.hasSub) tags.push("SUB");
            if (e.hasDub) tags.push("DUB");
            if (e.isFiller) tags.push("Filler");

            eps.push({
                ep_no: epNum,
                id: slug + "-" + epNum,
                title: epTitle,
                img: e.img || "",
                plot: e.description || "",
                tags: tags
            });
        });

        if (rt === "season_ep_info") {
            return { episodes: eps };
        }

        return {
            seasons: [{
                season_no: "1",
                name: "Season 1",
                id: [{
                    name: "Episodes (1 - " + eps.length + ")",
                    id: slug
                }]
            }],
            episodes: eps
        };
    } catch (e) {
        return {};
    }
}
