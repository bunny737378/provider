function handleHome(req) {
    let a = req.id || "";
    let p = req.page || 1;
    let headers = {"User-Agent": "okhttp/4.9.1", "Content-Type": "application/json", "x-device-id": D(), "apikey": K};
    
    function fmt(x, t) {
        return {titel: "", Img: (t === "s" ? STI : MTI) + x.mti, id: x.i, Type: x.mt === 0 ? "movie" : "tv"};
    }
    
    function safe(d, k1, k2, k3) {
        if (d && d[k1] != null) {
            d = d[k1];
            if (k2 && d && d[k2] != null) {
                d = d[k2];
                if (k3 && d && d[k3] != null) {
                    return d[k3];
                }
                return k3 ? null : d;
            }
            return k2 ? null : d;
        }
        return null;
    }
    
    try {
        let url = B + "/sliders";
        let body = {limit: 10, page: p};
        let recs = [];
        
        if (a === "slide") {
            let resp = Network.post(url, JSON.stringify(headers), JSON.stringify(body));
            let data = JSON.parse(JSON.parse(resp).body || "{}");
            recs = data.data && data.data.records ? data.data.records : [];
        } else {
            let s = "all";
            if (a.substring(0, 5) === "slug-") {
                s = "slug";
                a = a.substring(5);
            } else if (a[0] === "m") {
                s = "more";
                a = a.substring(1);
            }
            
            let parts = a.split("-");
            let t = parts[0];
            let i = parts[1];
            let cfg = {app: ["app-categories/movies", "getAllMovieByAppCategory-records", "appcategoryId"], ott: ["ott/movies", "getAllMovieByOtt-records", "ottId"], categ: ["categories/movies", "getMovieByCategory-records", "category_id"]}[t];
            
            url = B + "/" + cfg[0];
            body = {};
            body[cfg[2]] = parseInt(i);
            body.limit = s === "slug" ? 7 : 40;
            body.page = p;
            body.sortColumn = "movie_rating";
            body.sortOrder = "desc";
            
            let resp = Network.post(url, JSON.stringify(headers), JSON.stringify(body));
            let data = JSON.parse(JSON.parse(resp).body || "{}");
            let key = cfg[1];
            recs = data.data && data.data[key] ? data.data[key] : [];
            if (!Array.isArray(recs) && recs.movies) recs = recs.movies;
        }
        
        return {data: recs.map(x => fmt(x, a === "slide" ? "s" : "m")), nextpage: p + 1};
    } catch (e) {
        return {data: [], nextpage: p + 1};
    }
}

function handleSearch(req) {
    let sk = req.searchKey || "";
    let p = req.page || 1;
    if (p != 1) return {data: [], nextpage: p + 1};
    let headers = {"User-Agent": "okhttp/4.9.1", "Content-Type": "application/json", "x-device-id": D(), "apikey": K};
    
    try {
        let resp = Network.post(B + "/movies/search-movies-sessions", JSON.stringify(headers), JSON.stringify({searchKey: sk}));
        let body = JSON.parse(JSON.parse(resp).body || "{}");
        
        if (!body.status) return {data: [], nextpage: p + 1};
        
        let recs = body.data && body.data["getSearchMovieSessions-records"] ? body.data["getSearchMovieSessions-records"] : [];
        return {data: recs.map(x => ({titel: x.nm, Img: MTI + x.mti, id: x.i, Type: x.mt === 1 ? "tv" : "movie"})), nextpage: p + 1};
    } catch (e) {
        return {data: [], nextpage: p + 1};
    }
}