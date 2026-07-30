const B = "http://45.92.218.13:8080/api/1.2.24";
const K = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const AI = "http://45.92.218.13/specialeffect/public/uploads/actors/";
const MTI = "http://45.92.218.13/specialeffect/public/uploads/movies/thumbnail/";
const MPI = "http://45.92.218.13/specialeffect/public/uploads/movies/poster/";
const STI = "http://45.92.218.13/specialeffect/public/uploads/slider/thumbnail/";

function D() {
    return Math.random().toString(16).substr(2, 16);
}

function getApisList() {
    return {
        provider: "sff", 
        apis: {
            qsearch: false, 
            searchtext: [
                {  }
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
        else if (type === "allsearch") res = handleSearch(req);
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