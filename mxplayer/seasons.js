function handleSeasons(req) {
    let i = req.id || "";
    let mt = req.type || "";
    let rt = req.request_type;
    let headers = {"User-Agent": "Mozilla/5.0", "origin": URL, "referer": URL + "/"};
    
    try {
        if (mt === "movie") {
            let eps = [{ep_no: 1, id: i, title: "Watch Full Movie", img: "", plot: "", tags: []}];
            if (rt === "season_ep_info") return {episodes: eps};
            return {seasons: [{season_no: "1", name: "Full Movie", id: [{name: "Default", id: i}]}], episodes: eps};
        }
        
        let parts = i.split("-");
        if (rt === "season_info") {
            let html = JSON.parse(Network.get(URL + "/detail/tvshow/" + parts[0], JSON.stringify(headers))).body || "";
            let boxMatch = html.match(/seasons-tab-container.*?<\/div><div role="presentation"/s);
            let ss = [];
            
            if (boxMatch) {
                let cnt = 1;
                let regex = /data-tab="(\d+)".*?data-id="([^"]+)".*?<h2[^>]*>([^<]+)/gs;
                let m;
                while ((m = regex.exec(boxMatch[0])) !== null) {
                    ss.push({season_no: String(cnt), name: m[3].trim(), id: [{name: m[3].trim(), id: m[2]}]});
                    cnt++;
                }
            }
            
            let fsid = ss.length > 0 ? ss[0].id[0].id : '';
            let eps = [];
            
            if (fsid) {
                let url = API + "/detail/tab/tvshowepisodes?type=season&id=" + fsid;
                let n = 1;
                
                while (url && fsid) {
                    try {
                        let body = JSON.parse(JSON.parse(Network.get(url, JSON.stringify(headers))).body || "{}");
                        let items = body.items || [];
                        if (!items.length) break;
                        
                        items.forEach(e => {
                            let img = "";
                            (e.imageInfo || []).forEach(z => {
                                if (z.type === "bigpic") {
                                    let imgPath = (z.url || "").replace(/^\//, '');
                                    if (imgPath.startsWith('media/images/')) {
                                        let imgParts = imgPath.split('/');
                                        if (imgParts.length >= 7) img = PIC + "pic/" + imgParts[3] + "/en/" + imgParts[4] + "/" + imgParts[5] + "/" + imgParts[6];
                                        else img = PIC + imgPath;
                                    } else {
                                        img = PIC + imgPath;
                                    }
                                }
                            });
                            let tags = (e.rating ? ["rating = " + e.rating] : []).concat(e.languages || []);
                            eps.push({ep_no: n, id: fsid + "-" + n, title: e.title || '', img: img, plot: e.description || '', tags: tags});
                            n++;
                        });
                        
                        url = body.next ? API + "/detail/tab/tvshowepisodes?type=season&" + body.next + "&id=" + fsid : null;
                    } catch (e) {
                        break;
                    }
                }
            }
            return {seasons: ss, episodes: eps};
        } else if (rt === "season_ep_info") {
            let sid = parts[0];
            let eps = [];
            let url = API + "/detail/tab/tvshowepisodes?type=season&id=" + sid;
            let n = 1;
            
            while (url) {
                try {
                    let body = JSON.parse(JSON.parse(Network.get(url, JSON.stringify(headers))).body || "{}");
                    let items = body.items || [];
                    if (!items.length) break;
                    
                    items.forEach(e => {
                        let img = "";
                        (e.imageInfo || []).forEach(z => {
                            if (z.type === "bigpic") {
                                let imgPath = (z.url || "").replace(/^\//, '');
                                if (imgPath.startsWith('media/images/')) {
                                    let imgParts = imgPath.split('/');
                                    if (imgParts.length >= 7) img = PIC + "pic/" + imgParts[3] + "/en/" + imgParts[4] + "/" + imgParts[5] + "/" + imgParts[6];
                                    else img = PIC + imgPath;
                                } else {
                                    img = PIC + imgPath;
                                }
                            }
                        });
                        let tags = (e.rating ? ["rating = " + e.rating] : []).concat(e.languages || []);
                        eps.push({ep_no: n, id: sid + "-" + n, title: e.title || '', img: img, plot: e.description || '', tags: tags});
                        n++;
                    });
                    
                    url = body.next ? API + "/detail/tab/tvshowepisodes?type=season&" + body.next + "&id=" + sid : null;
                } catch (e) {
                    break;
                }
            }
            return {episodes: eps};
        }
        return {};
    } catch (e) {
        return {};
    }
}