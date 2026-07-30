function handleHome(req) {
    let cid = (req.id || "").replace('slug-', '');
    let p = req.page || "1";
    let isSlug = req.id.startsWith('slug-');
    
    if (!cid) return {data: [], nextpage: "2"};
    
    let url = API + "/list/" + cid + (p != "1" ? "?finalId=" + p + "&pageDirection=1" : "");
    
    try {
        let resp = Network.get(url, JSON.stringify({"User-Agent": "Mozilla/5.0"}));
        let body = JSON.parse(JSON.parse(resp).body || "{}");
        let out = [];
        
        (body.items || []).forEach(item => {
            let imgPath = item.image ? (isSlug ? item.image['16x9'] : item.image['2x3']) : '';
            let imgUrl = '';
            if (imgPath) {
                let parts = imgPath.split('/');
                if (parts.length >= 5) {
                    imgUrl = PIC + "pic/" + parts[3] + "/en/" + (isSlug ? "16x9/984x555" : "2x3/768x1152") + "/" + parts[4];
                } else {
                    imgUrl = imgPath;
                }
            }
            out.push({titel: item.title || '', Img: imgUrl, id: item.id || '', Type: item.type === "tvshow" ? "tv" : "movie"});
        });
        
        let m = (body.next || '').match(/finalId=([^&]+)/);
        return {data: out, nextpage: m ? m[1] : String(parseInt(p) + 1)};
    } catch (e) {
        return {data: [], nextpage: String(parseInt(p) + 1)};
    }
}

function handleSearch(req) {
    let mode = req.request_type;
    let sk = req.searchKey || "";
    
    if (!sk) return {data: [], nextpage: "2"};
    
    if (mode === "qsearch") {
        try {
            let resp = Network.get(API + "/search/suggest?query=" + encodeURIComponent(sk), JSON.stringify({"User-Agent": "Mozilla/5.0", "Origin": URL, "Referer": URL + "/"}));
            let body = JSON.parse(JSON.parse(resp).body || "[]");
            let titles = body.filter(item => item.query).map(item => ({titel: item.query}));
            return {data: titles, nextpage: "2"};
        } catch (e) {
            return {data: [], nextpage: "2"};
        }
    } else {
        let p = req.page || "1";
        let headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json, text/plain, */*", "Content-Type": "application/json", "origin": URL, "referer": URL + "/"};
        
        try {
            let next = parseInt(p) > 1 ? "&next=" + ((parseInt(p) - 1) * 10) : "";
            let resp = Network.post(API + "/search/resultv2?query=" + encodeURIComponent(sk) + next, JSON.stringify(headers), JSON.stringify({requestBody: "Muket4M14yIim3TArVEh7A=="}));
            let result = JSON.parse(JSON.parse(resp).body || "{}");
            let results = [];
            
            (result.sections || []).forEach(section => {
                (section.items || []).forEach(item => {
                    if (!["tvshow", "movie"].includes(item.type)) return;
                    let img = (item.image || {})['2x3'] || '';
                    if (!img) return;
                    let parts = img.split('/');
                    let imgUrl = parts.length >= 5 ? PIC + "pic/" + parts[3] + "/en/2x3/768x1152/" + parts[4] : img;
                    results.push({titel: item.title || '', Img: imgUrl, id: item.id || '', Type: item.type === "tvshow" ? "tv" : "movie"});
                });
            });
            return {data: results, nextpage: String(parseInt(p) + 1)};
        } catch (e) {
            return {data: [], nextpage: String(parseInt(p) + 1)};
        }
    }
}