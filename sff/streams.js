function handleStreams(req) {
    let i = req.id || "";
    let mt = req.type || "";
    let headers = {"User-Agent":"okhttp/4.9.1","Content-Type":"application/json","x-device-id":D(),"apikey":K};

    let en = null, sn = null;
    if (mt === "tv") {
        let cnt = (i.match(/-/g) || []).length;
        if (cnt === 2) {
            let p = i.split("-");
            i = p[0];
            sn = parseInt(p[1]);
            en = parseInt(p[2]);
        }
    }

    try {
        let resp = Network.post(B + "/movies/detail", JSON.stringify(headers), JSON.stringify({limit:1,page:1,movie_id:i,device_id:D()}));
        let body = JSON.parse(JSON.parse(resp).body || "{}");
        let d = body.data && body.data.detail ? body.data.detail : {};
        let ss = d.sessions || [];

        let v = {};
        if (mt === "movie") {
            let videos = d.videos || [];
            v = videos.length ? videos[0] : {};
        } else if (en && sn && sn - 1 < ss.length) {
            let vs = ss[sn - 1].videos || [];
            v = en - 1 < vs.length ? vs[en - 1] : {};
        }

        function tok() {
            try {
                let t = Network.post("http://45.92.218.13:8080/api/1.2.24/auth/yui27vg12", JSON.stringify({"Host":"45.92.218.13:8080","User-Agent":"SpecialEffect/1.0","Connection":"Keep-Alive","Accept":"application/json","Content-Type":"application/json","apikey":K,"x-device-id":D()}), JSON.stringify({user_name:"asds@#%qq&&rr",password:"@#$%adss%&*"}));
                let tokenData = JSON.parse(JSON.parse(t).body || "{}");
                let token = tokenData.yui27vg12 || "";
                return token.length > 8 ? token.substring(4, token.length - 4) : null;
            } catch(e) {
                return null;
            }
        }

        let out = [], seen = {};
        let links = [];

        if (v.link_1) links.push(v.link_1);
        if (v.link_3) links.push(v.link_3);
        if (v.links) v.links.forEach(x => {if(x.link) links.push(x.link);});
        if (v.links_3) v.links_3.forEach(x => {if(x.link) links.push(x.link);});

        for (let lnk of links) {
            if (lnk && !seen[lnk] && out.length < 4) {
                seen[lnk] = true;
                let tk = tok();
                let url = tk ? lnk + "?token=" + tk : lnk;

                out.push({
                    nm: "Server" + (out.length + 1),
                    Url: url,
                    refer: "http://45.92.218.13:8080",
                    Header: [],
                    Subtitle: []
                });
            }
        }

        return out;
    } catch(e) {
        return [];
    }
}