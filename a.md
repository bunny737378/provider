# CloudStream Extensions — Complete API / Response-Structure Reference

> Source of truth: `recloudstream/cloudstream` (master) → `library/src/commonMain/kotlin/com/lagradost/cloudstream3/`
> (`MainAPI.kt`, `utils/ExtractorApi.kt`, `plugins/BasePlugin.kt`) + `app/.../plugins/{PluginManager,RepositoryManager}.kt`
> + docs at `recloudstream.github.io/csdocs` (devs/*) + Dokka.
> Compiled: 22 Nov 2026.

---

## 0. The single most important fact

**CloudStream extensions do NOT expose HTTP/REST APIs and their responses are NOT JSON.**

An extension (`.cs3`) is a **compiled Kotlin/Dalvik plugin**. You don't "call an API endpoint" — you:

1. load `classes.dex` with `DexClassLoader`,
2. instantiate `manifest.pluginClassName` (must extend `BasePlugin` / `Plugin`),
3. call `load()` → the plugin calls `registerMainAPI(provider)` / `registerExtractorAPI(extractor)`,
4. then you call **Kotlin suspend functions** on the registered objects and receive **Kotlin data-class instances**.

So the "response structure" = the *data class definitions* below. Anything JSON-ish you see is either
(a) the repository/manifest metadata files, or (b) `kotlinx.serialization` output when the app
caches / backs up / re-parses those objects (e.g. `syncData` uses `toJson()`).

That means for your app: either run the DEX (Android: ship CloudStream's `library` module + DexClassLoader
— this is exactly how the official app works; JVM/desktop: dex2jar + URLClassLoader), or write a shim that
re-implements `MainAPI`/`ExtractorApi` (only works for extensions that don't use jsoup/okhttp/WebView).

---

## 1. How many "APIs" exist? (counts)

| Layer | Count | Notes |
|---|---|---|
| Plugin classes per `.cs3` | exactly 1 | `manifest.pluginClassName` |
| `MainAPI` (content provider) instances per `.cs3` | 1 … N | whatever `load()` registers; typically 1–5, mega-repos go 10+ |
| Callable methods per provider | **9** (+5 timeouts) | see §2 |
| Provider metadata properties | ~24 | see §3 |
| Built-in `ExtractorApi` instances in the app | **324** registered in `extractorApis` | ~319 unique domains, ~100 extractor "families"/files, tons of mirror-domain subclasses |
| Extractor APIs per extension | 0 … M | `registerExtractorAPI()`; most extensions register 0 and use built-ins |
| Response/POJO types you must model | **~18** | 5 search + 5 load + Episode/HomePage/SearchList/ExtractorLink/SubtitleFile/AudioFile/DrmLink/Trailer |
| Enums you must mirror | 12 | TvType, SearchQuality, ShowStatus, DubStatus, Qualities, ExtractorLinkType, ActorRole, ProviderType, VPNStatus, SyncIdName, SelectType, SelectValue |

---

## 2. `MainAPI` — the actual callable surface (9 methods)

```kotlin
abstract class MainAPI {
    // 1. Home page rows. page starts at 1. request comes from `mainPage` property.
    open suspend fun getMainPage(page: Int, request: MainPageRequest): HomePageResponse?

    // 2. Paginated search (default impl just wraps #3 and sets hasNext=false)
    open suspend fun search(query: String, page: Int): SearchResponseList?

    // 3. Legacy/primary search
    open suspend fun search(query: String): List<SearchResponse>?

    // 4. Fast search for the search-suggestions
    open suspend fun quickSearch(query: String): List<SearchResponse>?

    // 5. Open a detail page from a SearchResponse.url
    open suspend fun load(url: String): LoadResponse?

    // 6. Resolve playable links + subtitles.
    //    `data` = Episode.data (series) or LoadResponse.dataUrl (movie/live)
    //    Results are STREAMED through the two callbacks, return value = "did it work"
    open suspend fun loadLinks(
        data: String,
        isCasting: Boolean,
        subtitleCallback: (SubtitleFile) -> Unit,
        callback: (ExtractorLink) -> Unit
    ): Boolean

    // 7. Background poller while the player runs (e.g. refresh expiring token). Usually throws NotImplementedError.
    open suspend fun extractorVerifierJob(extractorData: String?)

    // 8. OkHttp interceptor injected into the video DataSource (custom headers/cookies)
    open fun getVideoInterceptor(extractorLink: ExtractorLink): Interceptor?

    // 9. Map an external ID (IMDb/MAL/…) to a `load()` URL
    open suspend fun getLoadUrl(name: SyncIdName, id: String): String?
}
```

Un-overridden methods `throw NotImplementedError()` → for your app: treat as “not supported”.

Global helper that plugins use instead of hand-picking an extractor:

```kotlin
suspend fun loadExtractor(
    url: String,
    referer: String? = null,
    subtitleCallback: (SubtitleFile) -> Unit,
    callback: (ExtractorLink) -> Unit
): Boolean
// matches by mainUrl prefix, then by Levenshtein partialRatio > 80 (mirror domains)
```

Timeouts enforced by the app (`APIRepository`): default **120 s**, clamped to **5 s … 480 s**, per-method override via
`loadLinksTimeoutMs`, `getMainPageTimeoutMs`, `searchTimeoutMs`, `quickSearchTimeoutMs`, `loadTimeoutMs`.
`LoadResponse` results are cached in-memory for 10 min, 20 entries.

---

## 3. `MainAPI` properties (metadata your UI needs)

```kotlin
open var name: String                     // "NONE"
open var mainUrl: String                  // "NONE"
open var storedCredentials: String?
open var canBeOverridden: Boolean         // clone-site feature
open var sequentialMainPage: Boolean      // serialize home requests
open var sequentialMainPageDelay: Long    // ms
open var sequentialMainPageScrollDelay: Long // ms
open var lang: String                     // BCP-47, e.g. "en", "hi", "zh-TW"
open val instantLinkLoading: Boolean      // links already inside `data`
open val hasChromecastSupport: Boolean
open val hasDownloadSupport: Boolean
open val usesWebView: Boolean
open val hasMainPage: Boolean
open val hasQuickSearch: Boolean
open val loadLinksTimeoutMs/getMainPageTimeoutMs/searchTimeoutMs/quickSearchTimeoutMs/loadTimeoutMs: Long?
open val supportedSyncNames: Set<SyncIdName>
open val supportedTypes: Set<TvType>      // default Movie, TvSeries, Cartoon, Anime, OVA
open val vpnStatus: VPNStatus
open val providerType: ProviderType
open val mainPage: List<MainPageData>
var sourcePlugin: String?                 // set by BasePlugin.registerMainAPI → your "extension id"
var lastHomepageRequest: Long
```

---

## 4. Response structures (exact fields)

Legend: `?` = nullable, `= x` = default. Field names below are the serialized names too
(the classes use `@SerialName`/`@JsonProperty` mirroring the Kotlin name, so JSON keys == field names).

### 4.1 `SearchResponse` (interface) — common to all 5 variants
```json
{
  "name": "string",
  "url": "string",
  "apiName": "string",
  "type": "TvType?",
  "posterUrl": "string?",
  "posterHeaders": {"k":"v"} ,
  "id": 0,
  "quality": "SearchQuality?",
  "score": {"data": 0}
}
```
Builders: `newMovieSearchResponse` / `newTvSeriesSearchResponse` / `newAnimeSearchResponse` /
`newLiveSearchResponse` / `newTorrentSearchResponse(name, url, type, fix = true) { /* extra fields */ }`

| Variant | Extra fields on top of the common set |
|---|---|
| `MovieSearchResponse` | `year: Int?` |
| `TvSeriesSearchResponse` | `year: Int?`, `episodes: Int?` |
| `AnimeSearchResponse` | `year: Int?`, `dubStatus: Set<DubStatus>?`, `otherName: String?`, `episodes: Map<DubStatus, Int>` |
| `LiveSearchResponse` | `lang: String?` |
| `TorrentSearchResponse` | — |

### 4.2 `SearchResponseList` (returned by `search(query, page)`)
```json
{ "items": [ /* SearchResponse[] */ ], "hasNext": false }
```

### 4.3 `HomePageResponse` + `HomePageList` (returned by `getMainPage`)
```json
{
  "items": [
    {
      "name": "Recent Movies",
      "list": [ /* SearchResponse[] */ ],
      "isHorizontalImages": false
    }
  ],
  "hasNext": true
}
```
Builder: `newHomePageResponse(name, list, hasNext?)`, `newHomePageResponse(MainPageRequest, list, hasNext?)`,
`newHomePageResponse(List<HomePageList>, hasNext?)`.
`MainPageData` (declared by provider): `{ "name": "Recent Movies", "data": "1", "horizontalImages": false }`
→ arrives in `getMainPage` as `MainPageRequest { name, data, horizontalImages }`.
Helper: `mainPageOf("1" to "Recent Movies", "2" to "Dubbed")`.

### 4.4 `LoadResponse` (interface) — base of all 5 detail types
```json
{
  "name": "string",
  "url": "string",
  "apiName": "string",
  "type": "TvType",
  "posterUrl": "string?",
  "posterHeaders": {"k":"v"},
  "year": 0,
  "plot": "string?",
  "score": {"data": 0},
  "tags": ["Action"],
  "duration": 0,              // minutes
  "trailers": [ /* TrailerData[] */ ],
  "recommendations": [ /* SearchResponse[] */ ],
  "actors": [ /* ActorData[] */ ],
  "comingSoon": false,
  "syncData": {"imdb":"tt123","tmdb":"123"},   // Map<String,String>, keys from IdPrefix
  "backgroundPosterUrl": "string?",
  "logoUrl": "string?",
  "contentRating": "string?",
  "uniqueUrl": "string"       // defaults to url
}
```

Per-type extras:

| Type | Extras |
|---|---|
| `MovieLoadResponse` | `dataUrl: String` ← **the opaque token you pass to `loadLinks`** |
| `LiveStreamLoadResponse` | `dataUrl: String` |
| `TvSeriesLoadResponse` | `episodes: List<Episode>`, `showStatus: ShowStatus?`, `nextAiring: NextAiring?`, `seasonNames: List<SeasonData>?` |
| `AnimeLoadResponse` | `engName: String?`, `japName: String?`, `episodes: Map<DubStatus, List<Episode>>`, `synonyms: List<String>?`, `showStatus`, `nextAiring`, `seasonNames` |
| `TorrentLoadResponse` | `magnet: String?`, `torrent: String?` (type defaults to `TvType.Torrent`) |

`EpisodeResponse` (implemented by TvSeries/Anime): `showStatus`, `nextAiring`, `seasonNames`,
`getLatestEpisodes(): Map<DubStatus, Int?>`, `getTotalEpisodeIndex(episode, season): Int`.

### 4.5 `Episode`
```json
{
  "data": "string",          // REQUIRED — passed to loadLinks(); usually a URL or a JSON blob
  "name": "string?",
  "season": 0,
  "episode": 0,
  "posterUrl": "string?",
  "score": {"data": 0},
  "description": "string?",
  "date": 0,                 // unix ms
  "runTime": 0               // minutes
}
```
Helper: `newEpisode(url) { episode = 1; name = "Ep 1" }`, `episode.addDate("2026-01-01")`.

### 4.6 `ExtractorLink` — the ONLY "playable stream" payload
```json
{
  "source": "VidHide",         // extractor name, shown in player
  "name": "VidHide 1080p",     // label shown in player
  "url": "https://…/master.m3u8",
  "referer": "https://site/…",
  "quality": 1080,             // Qualities.value int
  "headers": {"User-Agent":"…","Cookie":"…"},
  "extractorData": "string?",  // fed back into extractorVerifierJob
  "type": "M3U8",              // ExtractorLinkType
  "audioTracks": [ {"url":"…","headers":{"k":"v"}} ]
}
```
Derived (not serialized): `isM3u8`, `isDash`, `suspend getVideoSize()` (HEAD, VIDEO type only), `getAllHeaders()`
(moves `referer` into headers).
Builder: `newExtractorLink(source, name, url, type = INFER_TYPE) { referer = …; quality = Qualities.P1080.value }`.

`ExtractorLinkPlayList` (concatenated segments):
```json
{ "source":"…","name":"…","playlist":[{"url":"…","durationUs":60000000}],
  "referer":"…","quality":1080,"headers":{},"extractorData":null,"type":"VIDEO","audioTracks":[] }
```

`DrmExtractorLink` (adds DRM to the above):
```json
{ "…all ExtractorLink fields…": 0,
  "kid":"hex?", "key":"hex?", "uuid":"<widevine|playready|clearkey uuid>",
  "kty":"oct", "keyRequestParameters":{"k":"v"}, "licenseUrl":"https://…/license?" }
```

### 4.7 `SubtitleFile`
```json
{ "lang": "en", "url": "https://…/sub.vtt", "headers": {"k":"v"} }
```
Derived: `langTag` (IETF BCP-47, auto-derived from `lang` when possible).
Builder: `newSubtitleFile(lang, url) { headers = … }`.

### 4.8 `AudioFile` (separate audio track, usually m3u8 audio group)
```json
{ "url": "https://…/audio.m3u8", "headers": {"k":"v"} }
```
(There is no `label`/`lang` field in the current class, despite old docs.)

### 4.9 Small POJOs
```json
TrailerData      { "extractorUrl":"…", "referer":"…?", "raw":false, "headers":{} }
Actor            { "name":"…", "image":"…?" }
ActorData        { "actor":{…}, "role":"Main|Supporting|Background|?", "roleString":"…?", "voiceActor":{…}? }
NextAiring       { "episode":1, "unixTime":1700000000, "season":2 }
SeasonData       { "season":1, "name":"…?", "displaySeason":1 }
Tracker          { "malId":1, "kitsuId":"…?", "aniId":"…?", "image":"…?", "cover":"…?" }
ProvidersInfoJson{ "name":"…", "url":"…", "credentials":"…?", "status":1 }
SettingsJson     { "enableAdult": false }
```

---

## 5. Enums (exact values — you must mirror these)

```kotlin
enum class TvType(val value: Int?) {          // serialized as the INT
    Movie(1), AnimeMovie(2), TvSeries(3), Cartoon(4), Anime(5), OVA(6), Torrent(7),
    Documentary(8), AsianDrama(9), Live(10), NSFW(11), Others(12), Music(13),
    AudioBook(14), CustomMedia(15), Audio(16), Podcast(17), Video(18)
}

enum class SearchQuality(val value: Int?) {
    Cam(1), CamRip(2), HdCam(3), Telesync(4), WorkPrint(5), Telecine(6), HQ(7), HD(8),
    HDR(9), BlueRay(10), DVD(11), SD(12), FourK(13), UHD(14), SDR(15), WebRip(16)
}

enum class Qualities(var value: Int, val defaultPriority: Int) {
    Unknown(400,4), P144(144,0), P240(240,2), P360(360,3), P480(480,4),
    P720(720,5), P1080(1080,6), P1440(1440,7), P2160(2160,8)      // 2160 → "4K"
}

enum class ExtractorLinkType { VIDEO, M3U8, DASH, TORRENT, MAGNET }
// mime: video/mp4, application/x-mpegURL, application/dash+xml, application/x-bittorrent

enum class ShowStatus { Completed, Ongoing }
enum class DubStatus(val id: Int) { None(-1), Dubbed(1), Subbed(0) }
enum class ProviderType { MetaProvider, DirectProvider }
enum class VPNStatus { None, MightBeNeeded, Torrent }
enum class ActorRole { Main, Supporting, Background }
enum class SyncIdName { Anilist, MyAnimeList, Kitsu, Trakt, Imdb, Simkl, LocalList }
enum class SelectType { SingleSelect, MultiSelect, MultiSelectAndExclude }
enum class SelectValue { Selected, Excluded }
```

`Score` (rating wrapper, no public constructor): serialized as `{"data": Int}` where data is a decimal
0…10^9; `Score.from(x, maxScore)` / `from10`, read with `toInt(max)`, `toFloat(max)`, `toString(max)`.

---

## 6. Extractor API (`ExtractorApi`)

```kotlin
abstract class ExtractorApi {
    abstract val name: String          // "VidHide" — becomes ExtractorLink.source
    abstract val mainUrl: String       // used for URL matching
    abstract val requiresReferer: Boolean
    var sourcePlugin: String?

    // primary override — streams results via callbacks
    open suspend fun getUrl(url: String, referer: String?,
                            subtitleCallback: (SubtitleFile) -> Unit,
                            callback: (ExtractorLink) -> Unit)

    // legacy override — returns a list
    open suspend fun getUrl(url: String, referer: String?): List<ExtractorLink>?

    open fun getExtractorUrl(id: String): String
    suspend fun getSafeUrl(…subtitleCallback, callback)   // try/catch wrapper
}
```
Matching in `loadExtractor` is: `url.startsWith(extractor.mainUrl)` first (reverse registration order →
last registered wins), then Levenshtein `partialRatio > 80` to catch mirror domains.

Built-in pool: **324 instances / ~319 unique domains**, e.g. StreamTape (+5 mirrors), MixDrop (+7),
StreamSB (+20 `StreamSB1…StreamSB11`), DoodStream (+15), StreamWish (+40 variants `*wish`),
VidHide/VidHidePro (+9), Filemoon (+4), Vidara (+11), Voe, Vidmoly, Vidoza, Uqload, Gofile, Gdriveplayer (+10
TLDs), OkRu/Ok.ru, SibNet, VK, MailRu, Mediafire, Dailymotion, YouTube (plain/short/mobile/nocookie),
Blogger, InternetArchive, HubCloud, LuluStream, Mp4Upload, Krakenfiles, PixelDrain, Zplayer, MegaCloud, etc.

---

## 7. Plugin layer (what you must implement/parse)

### 7.1 `.cs3` file = ZIP
```
manifest.json
classes.dex
resources.arsc / res/**        (only if requiresResources = true)
```

`manifest.json` (from `BasePlugin.Manifest`):
```json
{
  "name": "MyProvider",
  "pluginClassName": "com.example.MyPlugin",
  "version": 1,
  "requiresResources": false
}
```

`BasePlugin` / `Plugin` API surface:
```kotlin
abstract class BasePlugin {
    var filename: String?                        // full path of the .cs3
    fun registerMainAPI(element: MainAPI)        // → APIHolder.allProviders
    fun registerExtractorAPI(element: ExtractorApi) // → extractorApis
    open fun load()                              // cross-platform entry
    open fun beforeUnload()
    @Serializable class Manifest { name, pluginClassName, requiresResources, version }
}
abstract class Plugin : BasePlugin() {
    open fun load(context: Context)              // Android entry; default calls load()
    fun registerVideoClickAction(element: VideoClickAction)
    var resources: Resources?
    var openSettings: ((Context) -> Unit)?
}
```
Loading order in the app (`PluginManager`): unzip → `PathClassLoader/DexClassLoader` → `loadClass(pluginClassName)`
→ instantiate → `filename = <abs path>` → `load(context)`; unload calls `beforeUnload()` and removes
providers/extractors whose `sourcePlugin == filename`.

### 7.2 Repository file (what a user "adds", short code `cs.repo` / `cloudstreamrepo://`)
```json
{
  "name": "My Repo",
  "description": "…",
  "manifestVersion": 1,
  "pluginLists": ["https://raw.githubusercontent.com/u/r/builds/plugins.json"],
  "iconUrl": "https://…/icon.png"
}
```
Saved internally as `RepositoryData { iconUrl?, name, url, description? }`.

### 7.3 `plugins.json` — array of `SitePlugin` (this is the metadata you'd show in a store UI)
```json
[
  {
    "url": "https://…/MyProvider.cs3",
    "status": 1,                 // 0 down, 1 ok, 2 slow, 3 beta-only
    "version": 12,               // bump → auto-update
    "apiVersion": 1,
    "name": "MyProvider",
    "internalName": "myprovider",
    "authors": ["me"],
    "description": "…",
    "repositoryUrl": "https://github.com/u/r",
    "tvTypes": ["Movie","TvSeries"],
    "language": "en",
    "iconUrl": "https://…/icon.png",
    "fileSize": 123456,
    "fileHash": "sha256-…"
  }
]
```

---

## 8. Gotchas for a "load extensions + call their APIs" app

1. **Callbacks, not return values** for `loadLinks` — you must collect `ExtractorLink` and `SubtitleFile`
   until the suspend fun returns (`true` = someone produced something). Never assume one link.
2. **Filters/callbacks can arrive on any dispatcher** in some extensions; buffer thread-safely.
3. `data` strings are **opaque** (`Episode.data`, `LoadResponse.dataUrl`). Sometimes a URL, sometimes a JSON
   blob, sometimes an encrypted token. Only the provider that produced it can consume it → you must keep the
   provider instance that returned it.
4. Timeouts are your responsibility outside the app: 120 s default, 5 s–480 s clamp.
5. `NotImplementedError` = feature not supported (don't treat as crash).
6. Many extensions need **WebView, cookies, Cloudflare solving, okhttp Ktor engine, jsoup, jackson,
   kotlinx.serialization, Rhino/JS engine** — if you re-implement `MainAPI` yourself, they will fail at link
   extraction. The realistic path on Android is to ship CloudStream's `library` module unmodified + DexClassLoader.
7. Extensions are **untrusted DEX** — anyone can publish a repo; the code runs with your app's permissions.
   The official app only mitigates by signing/`fileHash` checks at repo level, not sandboxing.
