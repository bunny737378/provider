function handleSeasons(req) {
    let i = req.id || "";
    let mt = req.type || "";
    let rt = req.request_type;
    let headers = {"User-Agent": "okhttp/4.9.1", "Content-Type": "application/json", "x-device-id": D(), "apikey": K};
    
    try {
        let sn = null;
        if (mt === "tv" && i.indexOf("-") > -1) {
            let p = i.split("-");
            i = p[0];
            sn = parseInt(p[1]);
        }
        
        let resp = Network.post(B + "/movies/detail", JSON.stringify(headers), JSON.stringify({limit: 1, page: 1, movie_id: i, device_id: D()}));
        let body = JSON.parse(JSON.parse(resp).body || "{}");
        let d = body.data && body.data.detail ? body.data.detail : {};
        let ss = d.sessions || [];
        
        function ep(v, idx, sd, s, m) {
            let tags = [];
            if (sd.rat) tags.push((sd.rat || 0) + "/10");
            if (sd.run) tags.push(sd.run + "");
            if (sd.r_year) tags.push(sd.r_year + "");
            return {ep_no: idx + 1, id: m + "-" + s + "-" + (idx + 1), title: v.title || "", img: "", plot: sd.plot || "", tags: tags};
        }
        
        let vs = d.videos || [];
        let fv = vs.length > 0 ? vs[0] : {};
        let res = {seasons: [], episodes: []};
        
        if (mt === "movie") {
            if (rt === "season_info") {
                res.seasons = [{season_no: "1", name: "Season 1", id: [{name: d.nm || "", id: i + "-1"}]}];
            }
            if (fv && fv.link_1) {
                let tags = [];
                if (d.rat) tags.push((d.rat || 0) + "/10");
                if (d.run) tags.push(d.run + "");
                if (d.r_year) tags.push(d.r_year + "");
                res.episodes = [{ep_no: 1, id: i + "-1-1", title: d.nm || "", img: "", plot: d.plot || "", tags: tags}];
            }
        } else if (rt === "season_info") {
            ss.forEach((x, idx) => {
                res.seasons.push({season_no: String(idx + 1), name: "Season " + (idx + 1), id: [{name: x.nm || "", id: i + "-" + (idx + 1)}]});
            });
            let fs = ss.length > 0 ? ss[0] : {};
            if (fs.videos) {
                fs.videos.forEach((v, idx) => {
                    res.episodes.push(ep(v, idx, fs, 1, i));
                });
            }
        } else if (rt === "season_ep_info" && sn) {
            let ts = sn - 1 < ss.length ? ss[sn - 1] : null;
            if (ts && ts.videos) {
                ts.videos.forEach((v, idx) => {
                    res.episodes.push(ep(v, idx, ts, sn, i));
                });
            }
        }
        
        return {seasons: res.seasons, episodes: res.episodes};
    } catch (e) {
        return {};
    }
}