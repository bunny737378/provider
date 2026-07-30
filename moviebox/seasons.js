function handleSeasons(req) {
    let rt = req.request_type;
    let parts = (req.id || "").split("-");
    
    if (parts.length !== 2) return { seasons: [], episodes: [] };
    
    let dub_id = parts[0];
    let season_no = parseInt(parts[1]);
    
    let info = callApi(API + "/get?subjectId=" + dub_id + "&se=" + season_no, "GET");
    if (!info || info.code !== 0) return { seasons: [], episodes: [] };
    
    let data = info.data || {};
    let dubs = data.dubs || [];
    let title = data.title || "";
    let desc = data.description || "";
    let subject_type = data.subjectType || 0;
    
    let all_seasons_data = {};
    dubs.forEach(d => {
        if (d.subjectId) {
            let sInfo = callApi(API + "/season-info?subjectId=" + d.subjectId, "GET");
            all_seasons_data[d.subjectId] = (sInfo && sInfo.code === 0 && sInfo.data)
                ? sInfo.data.seasons || []
                : [];
        }
    });
    
    // NEW: Agar dubs empty hai to apni subjectId se season-info call karo
    if (dubs.length === 0) {
        let sInfo = callApi(API + "/season-info?subjectId=" + dub_id, "GET");
        all_seasons_data[dub_id] = (sInfo && sInfo.code === 0 && sInfo.data)
            ? sInfo.data.seasons || []
            : [];
    }
    
    let out = { seasons: [], episodes: [] };
    
    if (subject_type === 1) {
        let season_list = [];
        dubs.forEach(dub => {
            let did = dub.subjectId;
            let seasons = all_seasons_data[did] || [];
            if (seasons.length > 0) {
                seasons.sort((a, b) => (a.se || 0) - (b.se || 0));
                seasons.forEach(s => {
                    season_list.push({
                        did: did,
                        se: s.se || 0,
                        resolutions: s.resolutions || []
                    });
                });
            }
        });
        
        // Movie fallback - already handled above via all_seasons_data[dub_id]
        if (dubs.length === 0) {
            let fallbackSeasons = all_seasons_data[dub_id] || [];
            
            if (fallbackSeasons.length > 0) {
                fallbackSeasons.sort((a, b) => (a.se || 0) - (b.se || 0));
                fallbackSeasons.forEach(s => {
                    season_list.push({
                        did: dub_id,
                        se: s.se || 0,
                        resolutions: s.resolutions || []
                    });
                });
            }
        }
        
        if (season_list.length > 0) {
            out.seasons.push({
                season_no: "1",
                name: "Multilangue",
                id: [{ name: "Season 0", id: req.id }]
            });
            
            let ep_counter = 1;
            let targetSeason = season_list.find(item => (item.resolutions || []).length > 0);
            
            if (!targetSeason && season_list.length > 0) {
                targetSeason = season_list[0];
            }
            
            if (targetSeason) {
                let resolutions = targetSeason.resolutions || [];
                let q = resolutions.map(r => String(r.resolution)).filter(r => r);
                let eid = q.length > 0
                    ? (targetSeason.did + "-0-0--" + q.join("-"))
                    : (targetSeason.did + "-0-0");
                
                let dub_name = "";
                dubs.forEach(dub => {
                    if (dub.subjectId === targetSeason.did) {
                        dub_name = dub.lanName || "";
                    }
                });
                
                let tags = [];
                if (data.releaseDate) tags.push(data.releaseDate);
                if (data.imdbRatingValue) tags.push("IMDB: " + data.imdbRatingValue);
                if (data.countryName) tags.push(data.countryName);
                
                out.episodes.push({
                    ep_no: ep_counter.toString(),
                    id: eid,
                    title: title + " [" + dub_name + "]",
                    img: "",
                    plot: desc,
                    tags: tags
                });
            }
        }
    } else {
        let cnt = 1;
        let user_dub = dubs.find(d => d.subjectId === dub_id);
        let sorted_dubs = user_dub
            ? [user_dub].concat(dubs.filter(d => d.subjectId !== dub_id))
            : dubs;
        
        // Agar dubs empty hai to sorted_dubs mein kuch nahi hoga
        // Isliye hum manually dub_id use karenge
        let dubIdsToProcess = sorted_dubs.length > 0 
            ? sorted_dubs.map(d => d.subjectId)
            : [dub_id];
        
        dubIdsToProcess.forEach(did => {
            let name = "";
            if (sorted_dubs.length > 0) {
                let dub = sorted_dubs.find(d => d.subjectId === did);
                name = dub ? dub.lanName || "" : "";
            }
            
            let seasons = all_seasons_data[did] || [];
            
            if (seasons.length > 0) {
                seasons.sort((a, b) => (a.se || 0) - (b.se || 0));
                let ids = seasons.map(s => ({
                    name: "Season " + s.se,
                    id: did + "-" + s.se
                }));
                
                if (ids.length > 0) {
                    out.seasons.push({
                        season_no: cnt.toString(),
                        name: name || "Default",
                        id: ids
                    });
                    cnt++;
                }
            }
        });
        
        let user_seasons = all_seasons_data[dub_id] || [];
        
        let target_season = user_seasons.find(s => s.se === season_no);
        
        if (!target_season && user_seasons.length > 0) {
            user_seasons.sort((a, b) => (a.se || 0) - (b.se || 0));
            target_season = user_seasons[0];
        }
        
        if (target_season) {
            let eps = [];
            
            if (target_season.allEp) {
                target_season.allEp.split(",").forEach(x => {
                    let trimmed = x.trim();
                    if (trimmed) eps.push(parseInt(trimmed));
                });
            } else {
                let max = target_season.maxEp || 0;
                for (let i = 1; i <= max; i++) eps.push(i);
            }
            
            let q = [];
            if (target_season.resolutions) {
                target_season.resolutions.forEach(r => q.push(r.resolution.toString()));
            }
            
            let ep_counter = 1;
            let seasonNo = target_season.se || 0;
            
            eps.forEach(ep => {
                let eid = q.length > 0
                    ? (dub_id + "-" + seasonNo + "-" + ep + "--" + q.join("-"))
                    : (dub_id + "-" + seasonNo + "-" + ep);
                
                let pSeason = seasonNo < 10 ? "0" + seasonNo : seasonNo.toString();
                let pEp = ep < 10 ? "0" + ep : ep.toString();
                
                let tags = [];
                if (data.releaseDate) tags.push(data.releaseDate);
                if (data.imdbRatingValue) tags.push("IMDB: " + data.imdbRatingValue);
                if (data.countryName) tags.push(data.countryName);
                
                out.episodes.push({
                    ep_no: ep_counter.toString(),
                    id: eid,
                    title: title + " [S" + pSeason + " EP" + pEp + "]",
                    img: "",
                    plot: desc,
                    tags: tags
                });
                
                ep_counter++;
            });
        }
    }
    
    if (rt === "season_ep_info") return { episodes: out.episodes };
    return out;
}