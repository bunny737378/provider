function handleDiscovery(req) {
    let type = req.request_type;
    
    if (type === "home") {
        return handleHome(req);
    } else {
        return handleSearch(req);
    }
}

function handleHome(req) {
    let p = req.page || "1";
    let cid = req.id || "";
    
    if (!cid) return { data: [], nextpage: "2" };
    
    let parts = cid.split("-");
    if (parts.length !== 2) return { data: [], nextpage: (parseInt(p) + 1).toString() };
    
    let cat_type = parts[0];
    let tab_id = parts[1];
    let results = [];
    
    if (cat_type === "slug") {
        let data = callApi(API_HOME + "/tab-operating?tabId=" + tab_id, "GET");
        
        if (data && data.code === 0 && data.data && data.data.items) {
            data.data.items.forEach(item => {
                if (item.type === 'BANNER' && item.banner && item.banner.banners) {
                    item.banner.banners.forEach(banner => {
                        if (banner.subject) {
                            let sub = banner.subject;
                            let st = sub.subjectType || 0;
                            results.push({
                                titel: sub.title || "",
                                Img: (sub.cover && sub.cover.url) ? sub.cover.url : "",
                                id: (sub.subjectId || "") + "-1",
                                Type: st === 1 ? "movie" : "tv"
                            });
                        }
                    });
                }
            });
        }
    } else {
        let data = callApi(
            API_HOME + "/tab/ranking-list?tabId=" + tab_id +
            "&categoryType=" + cat_type +
            "&page=" + p +
            "&perPage=10",
            "GET"
        );
        
        if (data && data.code === 0 && data.data && data.data.subjects) {
            data.data.subjects.forEach(sub => {
                let st = sub.subjectType || 0;
                let season = sub.season || 0;
                if (st === 2 && season === 0) season = 1;
                
                results.push({
                    titel: sub.title || "",
                    Img: (sub.cover && sub.cover.url) ? sub.cover.url : "",
                    id: (sub.subjectId || "") + "-" + (st === 2 ? season : 1),
                    Type: st === 1 ? "movie" : "tv"
                });
            });
        }
    }
    
    return {
        data: results,
        nextpage: (parseInt(p) + 1).toString()
    };
}

function handleSearch(req) {
    let mode = req.request_type;
    let kw = req.searchKey || "";
    
    if (!kw) return { data: [], nextpage: "2" };
    
    if (mode === "qsearch") {
        let data = callApi(
            API + "/search-suggest?keyword=" + encodeURIComponent(kw) + "&perPage=20&resultMode=2",
            "GET"
        );
        
        if (!data || data.code !== 0) return { data: [], nextpage: "2" };
        
        let out = [];
        if (data.data && data.data.items) {
            data.data.items.forEach(item => {
                if (item.word) out.push({ titel: item.word });
            });
        }
        
        return { data: out, nextpage: "2" };
    } else {
        let p = req.page || "1";
        let tab = "MovieTV";
        
        if (mode === "msearch") tab = "Movie";
        else if (mode === "tvsearch") tab = "TV";
        
        let bodyStr = JSON.stringify({
            page: parseInt(p),
            perPage: 10,
            keyword: kw,
            tabId: tab
        });
        
        let data = callApi(API + "/search/v2", "POST", bodyStr);
        
        if (!data || data.code !== 0) return { data: [], nextpage: (parseInt(p) + 1).toString() };
        
        let results = [];
        if (data.data && data.data.results) {
            data.data.results.forEach(item => {
                if (item.subjects) {
                    item.subjects.forEach(sub => {
                        let st = sub.subjectType || 0;
                        let season = sub.season || 0;
                        if (st === 2 && season === 0) season = 1;
                        
                        results.push({
                            titel: sub.title || "",
                            Img: (sub.cover && sub.cover.url) ? sub.cover.url : "",
                            id: (sub.subjectId || "") + "-" + (st === 2 ? season : 1),
                            Type: st === 1 ? "movie" : "tv"
                        });
                    });
                }
            });
        }
        
        return {
            data: results,
            nextpage: (parseInt(p) + 1).toString()
        };
    }
}