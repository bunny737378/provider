const CDN = "https://d3sgzbosmwirao.cloudfront.net/";
const URL = "https://www.mxplayer.in";
const API = "https://api.mxplayer.in/v1/web";
const PIC = "https://qqcdnpictest.mxplay.com/";
const SEO = "https://seo.mxplayer.in/v1/api/seo";

function getApisList() {
    return {
        provider: "mxplayer",
        apis: {
            qsearch: true,
            searchtext: [
                { }
            ]
        }
    };
}

function handleRequest(reqJsonStr) {
    let req = JSON.parse(reqJsonStr);
    let type = req.request_type;
    let res = {};
    try {
        if (type === "catalog") res = getCatalog();
        else if (type === "home") res = handleHome(req);
        else if (type === "meta") res = handleMeta(req);
        else if (type === "season_info" || type === "season_ep_info") res = handleSeasons(req);
        else if (type === "stream") res = handleStreams(req);
        else if (type === "qsearch" || type === "allsearch") res = handleSearch(req);
        else if (type === "apislist") res = getApisList(); // <-- Added This
        else res = {error: "Unknown type: " + type};
    } catch (e) {
        res = {error: e.toString()};
    }
    return JSON.stringify(res);
}

function getCatalog() {
    return CATALOG_DATA;
}