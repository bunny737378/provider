function handleMeta(req) {
    let i = req.id || "";
    let headers = {"User-Agent": "okhttp/4.9.1", "Content-Type": "application/json", "x-device-id": D(), "apikey": K};
    
    try {
        let r1 = Network.post(B + "/movies/detail", JSON.stringify(headers), JSON.stringify({limit: 1, page: 1, movie_id: i, device_id: D()}));
        let r2 = Network.post(B + "/movies/detail/related-movies", JSON.stringify(headers), JSON.stringify({limit: 9, page: 1, sortColumn: "shuffle", sortOrder: "DESC", shuffleIds: [], searchKey: "", movie_id: parseInt(i)}));
        
        let body1 = JSON.parse(JSON.parse(r1).body || "{}");
        let body2 = JSON.parse(JSON.parse(r2).body || "{}");
        
        let r = body1.data && body1.data.detail ? body1.data.detail : {};
        let rr = body2.data && body2.data.records ? body2.data.records : [];
        
        let actors = [];
        if (r.actors) {
            r.actors.forEach(x => {
                actors.push({name: "", role: "", Img: AI + (x.ai || "")});
            });
        }
        
        let recommend = [];
        rr.forEach(x => {
            recommend.push({titel: x.nm || "", Img: MTI + x.mti, id: x.i, Type: x.mt === 0 ? "movie" : "tv"});
        });
        
        let tags = [];
        if (r.rat) tags.push((r.rat || 0) + "/10");
        if (r.r_year) tags.push(r.r_year + "");
        
        return {
            basic: {Id: r.i || "", Type: r.mt === 0 ? "movie" : "tv", Bg: MPI + (r.mpi || ""), Tags: tags, Plot: r.plot || "", titel: r.nm || ""},
            actors: actors,
            recommend: recommend
        };
    } catch (e) {
        return {};
    }
}