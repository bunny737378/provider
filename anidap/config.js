const URL = "https://anidap.lol";
const API = "https://anidap.lol/api";
const CHAD_API = "https://chad.anidap.lol/rest/api";

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://anidap.lol/home",
    "Origin": "https://anidap.lol",
    "Accept": "application/json"
};

function getApisList() {
    return {
        provider: "anidap",
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
        else if (type === "apislist") res = getApisList();
        else res = {error: "Unknown type: " + type};
    } catch (e) {
        res = {error: e.toString()};
    }
    return JSON.stringify(res);
}

function getCatalog() {
    return typeof CATALOG_DATA !== "undefined" ? CATALOG_DATA : {};
}
