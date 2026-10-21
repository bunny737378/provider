function handleHome(req) {
    let cid = req.id || "trending";
    let p = req.page || "1";
    let isSlug = cid.startsWith("slug-");
    let out = [];

    try {
        let headersStr = JSON.stringify(HEADERS);

        if (isSlug) {
            let resp = Network.get(API + "/anime/hero", headersStr);
            let json = JSON.parse(JSON.parse(resp).body || "{}");
            let items = (json.data && json.data.data) || json.data || [];
            if (Array.isArray(items)) {
                items.forEach(function(item) {
                    let title = item.titleEnglish || item.romajiTitle || item.slug || "";
                    let img = item.bannerImage || item.coverImage || "";
                    let id = item.slug || item.id || "";
                    if (id && title) {
                        out.push({
                            titel: title,
                            Img: img,
                            id: id,
                            Type: "tv"
                        });
                    }
                });
            }
            return { data: out, nextpage: "2" };
        }

        if (cid === "recents") {
            let resp = Network.get(API + "/anime/recents", headersStr);
            let json = JSON.parse(JSON.parse(resp).body || "{}");
            let items = (json.data && json.data.data) || json.data || [];
            if (Array.isArray(items)) {
                items.forEach(function(item) {
                    let t = item.title || {};
                    let title = t.english || t.romaji || t.userPreferred || "";
                    let img = (item.coverImage && (item.coverImage.large || item.coverImage.extraLarge)) || item.bannerImage || "";
                    let id = item.slug || String(item.id || "");
                    if (id && title) {
                        out.push({
                            titel: title,
                            Img: img,
                            id: id,
                            Type: (item.type || "").toLowerCase() === "movie" ? "movie" : "tv"
                        });
                    }
                });
            }
            return { data: out, nextpage: String(parseInt(p) + 1) };
        }

        // Default or trending
        let endpoint = API + "/anime/trending";
        let resp = Network.get(endpoint, headersStr);
        let json = JSON.parse(JSON.parse(resp).body || "{}");
        let results = [];
        if (json.data && json.data.data && Array.isArray(json.data.data.results)) {
            results = json.data.data.results;
        } else if (json.data && Array.isArray(json.data.results)) {
            results = json.data.results;
        } else if (Array.isArray(json.results)) {
            results = json.results;
        }

        results.forEach(function(item) {
            let t = item.title || {};
            let title = t.english || t.romaji || t.userPreferred || "";
            let img = item.image || item.cover || "";
            let id = String(item.id || item.malId || "");
            if (id && title) {
                out.push({
                    titel: title,
                    Img: img,
                    id: id,
                    Type: (item.type || "").toLowerCase() === "movie" ? "movie" : "tv"
                });
            }
        });

        return { data: out, nextpage: String(parseInt(p) + 1) };
    } catch (e) {
        return { data: [], nextpage: String(parseInt(p) + 1) };
    }
}

function handleSearch(req) {
    let mode = req.request_type;
    let sk = req.searchKey || "";
    let p = req.page || "1";

    if (!sk) return { data: [], nextpage: "2" };

    try {
        let headersStr = JSON.stringify(HEADERS);
        let url = API + "/anime/search?q=" + encodeURIComponent(sk) + "&page=" + p;
        let resp = Network.get(url, headersStr);
        let json = JSON.parse(JSON.parse(resp).body || "{}");
        let results = [];

        if (Array.isArray(json.results)) {
            results = json.results;
        } else if (json.data && Array.isArray(json.data.results)) {
            results = json.data.results;
        } else if (Array.isArray(json.data)) {
            results = json.data;
        }

        if (mode === "qsearch") {
            let titles = [];
            results.forEach(function(item) {
                let t = item.title || {};
                let title = t.english || t.romaji || t.userPreferred || item.name || "";
                if (title) titles.push({ titel: title });
            });
            return { data: titles, nextpage: "2" };
        } else {
            let out = [];
            results.forEach(function(item) {
                let t = item.title || {};
                let title = t.english || t.romaji || t.userPreferred || item.name || "";
                let img = item.image || item.cover || "";
                let id = String(item.id || item.malId || "");
                let type = (item.type || "").toLowerCase() === "movie" ? "movie" : "tv";
                if (id && title) {
                    out.push({
                        titel: title,
                        Img: img,
                        id: id,
                        Type: type
                    });
                }
            });
            return { data: out, nextpage: String(parseInt(p) + 1) };
        }
    } catch (e) {
        return { data: [], nextpage: String(parseInt(p) + 1) };
    }
}
