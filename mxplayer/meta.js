function handleMeta(req) {
    let cid = req.id || "";
    let ctype = req.type || "";
    
    if (!cid || !ctype) return {};
    
    let headers = {"User-Agent": "Mozilla/5.0", "origin": URL, "referer": URL + "/"};
    
    try {
        let typeStr = ctype === 'tv' ? 'tvshow' : 'movie';
        let html = JSON.parse(Network.get(URL + "/detail/" + typeStr + "/" + cid, JSON.stringify(headers))).body || "";
        
        let metaMatch = html.match(/property="al:ios:url"\s+content="mxplayer:\/\/mxplayer\.com([^"]+)"/);
        if (!metaMatch) return {};
        
        let seoResp = JSON.parse(Network.get(SEO + "/get-url-details?url=" + encodeURIComponent(metaMatch[1]), JSON.stringify(headers)));
        let seo = (JSON.parse(seoResp.body || "{}").data || {}).source || {};
        
        let bgPath = (html.match(/"type":"bigpic".*?"url":"([^"]+)"/) || [])[1] || "";
        let bg = "";
        if (bgPath) {
            let parts = bgPath.split('/');
            bg = parts.length >= 5 ? PIC + "pic/" + parts[3] + "/en/16x9/984x555/" + parts[4] : bgPath;
        }
        
        let actors = [];
        if (seo.actors) {
            seo.actors.forEach(a => {
                let aid = a.id || "";
                let picPath = (html.match(new RegExp(`url":"(pic/${aid}/none/1x1/\\d+x\\d+/[^"]+)"`)) || [])[1] || "";
                let pic = "";
                if (picPath) {
                    let parts = picPath.split('/');
                    pic = parts.length >= 6 ? PIC + "pic/" + parts[1] + "/en/1x1/312x312/" + parts[5] : picPath;
                }
                actors.push({name: a.name || '', role: '', Img: pic});
            });
        }
        
        let recType = ctype === 'tv' ? 'tvshowrelated_shows?type=tv_show' : 'movierecommended?type=movie';
        let recResp = JSON.parse(Network.get(API + "/detail/tab/" + recType + "&id=" + cid + "&filterId=" + cid, JSON.stringify(headers)));
        let recBody = JSON.parse(recResp.body || "{}");
        
        let recommend = [];
        (recBody.items || []).forEach(i => {
            let p = (i.image || {})['2x3'] || '';
            let imgUrl = "";
            if (p) {
                let parts = p.split('/');
                imgUrl = parts.length >= 5 ? PIC + "pic/" + parts[3] + "/en/2x3/768x1152/" + parts[4] : p;
            }
            recommend.push({titel: i.title || '', Img: imgUrl, id: i.id || '', Type: i.type === "tvshow" ? "tv" : "movie"});
        });
        
        let tags = [];
        let ratingMatch = html.match(/"rating":(\d+)/);
        if (ratingMatch) tags.push("rating: " + ratingMatch[1]);
        if (seo.language) seo.language.forEach(lang => tags.push(lang));
        
        return {basic: {Id: cid, Type: ctype, Bg: bg, Tags: tags, Plot: seo.description || ''}, actors: actors, recommend: recommend};
    } catch (e) {
        return {};
    }
}