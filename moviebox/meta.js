function handleMeta(req) {
    let parts = (req.id || "").split("-");
    if (parts.length !== 2) return {};
    
    let sid = parts[0];
    let season = parts[1];
    
    let meta = callApi(API + "/get?subjectId=" + sid + "&se=" + season, "GET");
    if (!meta || meta.code !== 0) return {};
    
    let md = meta.data || {};
    
    let bodyStr = JSON.stringify({ subjectId: sid, perPage: 9, page: 1 });
    let rec = callApi(API + "/detail-rec", "POST", bodyStr);
    
    let bg = "";
    if (md.preVideoCover && md.preVideoCover.url) {
        bg = md.preVideoCover.url;
    } else if (md.cover && md.cover.url) {
        bg = md.cover.url;
    }
    
    let t = md.subjectType || 0;
    
    let actors = [];
    if (md.staffList) {
        md.staffList.forEach(s => {
            if (s.name && s.character) {
                actors.push({
                    name: s.name,
                    role: s.character,
                    Img: s.avatarUrl || ""
                });
            }
        });
    }
    
    let recommend = [];
    if (rec && rec.data && rec.data.items) {
        rec.data.items.forEach(i => {
            recommend.push({
                titel: i.title || "",
                Img: (i.cover && i.cover.url) ? i.cover.url : "",
                id: (i.subjectId || "") + "-" + (i.season || 1),
                Type: i.subjectType === 2 ? "tv" : (i.subjectType === 1 ? "movie" : "")
            });
        });
    }
    
    let tags = [];
    if (md.releaseDate) tags.push(md.releaseDate);
    if (md.countryName) tags.push(md.countryName);
    if (md.language) tags.push(md.language);
    if (md.imdbRatingValue) tags.push("IMDB: " + md.imdbRatingValue);
    
    return {
        basic: {
            Id: req.id,
            Type: t === 2 ? "tv" : (t === 1 ? "movie" : ""),
            Bg: bg,
            Tags: tags,
            Plot: md.description || ""
        },
        actors: actors,
        recommend: recommend
    };
}