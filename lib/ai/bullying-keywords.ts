// Cebuano/Bisaya and Tagalog vocabulary for the three Levels of Disciplinary
// Intervention in DepEd Order No. 006, s. 2026, Section 21 (First Level ->
// "minor", Second -> "serious", Third -> "critical"; see lib/ai/severity.ts).
//
// Used three ways: (1) given to Claude as a reading guide, (2) scanned
// against the report text to hand Claude (and staff) a list of what matched,
// and (3) as the whole classifier when no ANTHROPIC_API_KEY is set. These are
// HINTS, not verdicts — many words are ordinary language outside bullying
// ("mura" = "like", "sarap" = "delicious", "hot", "dugo" = "blood"), so:
//   - `terms` are strong: one match counts as 1.
//   - `weak` terms are the everyday-words kind: each counts as 0.5, so a
//     category needs two of them (or one strong term) to register.
//   - `minMatches` raises the bar for categories where one hit isn't enough
//     (posting/sharing words appear in harmless reports too).
//   - A term listed at several Levels counts at the HIGHEST one (e.g. "bakla"
//     is both a First Level insult and a Second Level homophobic slur).
//     Punching/pinching words stay First Level; escalating to Second needs an
//     injury word, which is why those two lists are kept separate.

export type KeywordLevel = 1 | 2 | 3;

export interface KeywordCategory {
  id: string;
  level: KeywordLevel;
  label: string;
  terms: string[];
  weak?: string[];
  // Matched as plain substrings (word stems) instead of whole words.
  stems?: string[];
  minMatches?: number;
  // A Cyber tag from the student counts as one extra match for this category.
  cyberAssisted?: boolean;
  // May raise a result Claude already gave (only for high-precision terms).
  floor?: boolean;
}

export const KEYWORD_CATEGORIES: KeywordCategory[] = [
  // ---------------------------------------------------------------- Level 1
  {
    id: "l1-profanity",
    level: 1,
    label: "Profanities, swearwords, insulting name-calling",
    terms: [
      "yawa", "yawaa", "ywa", "yawa ka", "piste", "pisti", "pste", "pisteng yawa", "atay", "giatay", "gi-atay",
      "animal ka", "buang", "boang", "bwang", "bogo", "bugo", "gago", "giango", "amaw", "tonto", "tanga", "litse",
      "leche", "lintian", "linti", "bilat", "baboy", "unggoy", "iro", "iring", "bayot", "tomboy", "bati", "law-ay",
      "maot", "tambok", "niwang", "itom", "bungi", "kalbo", "hugaw", "baho", "pobre", "walay pulos",
      "gipanghimaraut", "gisultihan ug bastos", "gibastos", "gibiaybiay", "gitamay", "gipakaulawan", "gisinggitan",
      "putang ina", "putangina", "tangina", "tang ina", "tngina", "tngna", "pota", "puta", "pakyu", "pak u", "gaga",
      "ulol", "olol", "tarantado", "bobo", "bubu", "inutil", "siraulo", "letse", "punyeta", "bwisit", "buwisit",
      "hayop", "hayop ka", "hinayupak", "peste", "lintik", "kupal", "aso", "bakla", "pangit", "mataba", "taba",
      "payat", "negro", "negra", "mabaho", "dugyot", "mahirap", "walang kwenta", "minura", "pinagmumura", "binastos",
      "nilait", "nilalait", "minaliit", "pinahiya", "hiniya", "sinigawan", "sinabihan ng masama",
    ],
    weak: ["animal", "mura", "gimura"],
  },
  {
    id: "l1-pranks",
    level: 1,
    label: "Disruptive behavior and pranks",
    terms: [
      "gi-trip", "gitripan", "gi-prank", "gibugalbugalan", "giyagayaga", "gikataw-an", "gikantiyawan", "kantiyaw",
      "gilansi", "gisamok", "samokan", "gisamok sa klase", "gibinuang", "gitulisan", "gibira ang lingkuranan",
      "gibutangan ug sulat sa likod", "gisulatan ang libro", "gisulatan ang notebook", "gitagoan ang gamit",
      "gibasa", "gisabwagan", "gilabayan ug papel", "gipakaulawan sa klase", "gi-video", "gi-post sa fb",
      "gi-post sa tiktok", "gi-group chat", "gihimong meme", "pinagtripan", "tinitrip", "pinrank", "inasar", "inaasar",
      "tinukso", "tinutukso", "kinantiyawan", "binibiro", "pinagtatawanan", "nilinlang", "ginugulo", "inistorbo",
      "hinila ang upuan", "nilagyan ng papel sa likod", "sinulatan ang notebook", "itinago ang gamit", "binuhusan",
      "binato ng papel", "pinahiya sa klase", "vinideohan", "pinost sa fb", "pinost sa tiktok", "ginawang meme",
      "pinagkaisahan", "pinagtutulungan",
    ],
    weak: ["trip", "prank", "niloko", "binasa"],
  },
  {
    id: "l1-grabbing",
    level: 1,
    label: "Grabbing a learner's belongings without permission",
    terms: [
      "gipangkuha", "giilog", "ilog", "gihablot", "gitagoan", "gihulam nga wala nananghid", "gigamit nga wala nananghid",
      "gi-agaw", "wala gibalik", "gipangayo sa pugos", "gikuhaan ug kwarta", "gikuhaan ug baon", "gikuhaan ug balon",
      "gikuhaan ug bag", "gikuhaan ug cellphone", "gikuhaan ug ballpen", "gikuhaan ug notebook", "gikuhaan ug payong",
      "inagaw", "hinablot", "hiniram nang walang paalam", "ginamit nang walang paalam", "hindi ibinalik",
      "pinilit hingin", "kinikilan", "kinuhaan ng pera", "kinuhaan ng baon", "kinuha ang bag", "kinuha ang cellphone",
      "kinuha ang ballpen", "kinuha ang notebook", "kinuha ang payong",
    ],
    weak: ["gikuha", "kinuha", "agaw", "gitago", "itinago", "tinago", "kawat", "gikawat", "nakaw", "ninakaw", "kinupit"],
  },
  {
    id: "l1-punching",
    level: 1,
    label: "Punching, pinching (no injury stated)",
    terms: [
      "gisumbag", "sumbag", "gikusi", "kusi", "gisagpa", "gilagpot", "gitamparos", "gituklod", "tuklod", "gipatid",
      "gisipa", "gibunal", "gibunalan", "gisiko", "gipaak", "gikagat", "gibira ang buhok", "gilabay", "gilabayan",
      "gipitik", "gikumot", "gikulata", "gidakop sa liog", "gipandakan", "sinuntok", "suntok", "kinurot", "kurot",
      "sinampal", "sampal", "tinulak", "tulak", "sinipa", "tinadyakan", "binatukan", "batok", "kinutusan", "siniko",
      "kinagat", "hinila ang buhok", "sinabunutan", "hinampas", "pinalo", "binato", "pinitik", "sinakal", "tinapakan",
      "piningot",
    ],
  },
  {
    id: "l1-fighting",
    level: 1,
    label: "Fighting a learner (no injury stated)",
    terms: [
      "nag-away", "away", "nagsumbagay", "nagbunalay", "nagtukloday", "nagsagpaay", "nagbirahay ug buhok", "kumbati",
      "nagkumbati", "rambol", "nag-rambol", "gihagit", "hagit", "gihagit ug away", "dali sa gawas", "gihulat sa gawas",
      "gi-abangan", "gipangitaan ug away", "gilumbaan", "nagsuntukan", "nagbugbugan", "nagtulakan", "nagsampalan",
      "nagsabunutan", "nagrambol", "nagkagulo", "hinamon", "hinamon ng away", "tara labas", "labas tayo", "inabangan",
      "abangan", "hinanapan ng away", "naghahamon", "gulpi",
    ],
  },
  {
    id: "l1-general",
    level: 1,
    label: "General bullying terms",
    terms: [
      "gi-bully", "gibully", "gidaogdaog", "daugdaug", "gilutos", "gipig-ot", "gihadlok", "gipasagdan sa grupo",
      "wala giapil", "binubully", "inaapi", "api", "tinatakot", "hindi isinasama", "iniiwasan", "inetsapwera",
    ],
  },

  // ---------------------------------------------------------------- Level 2
  {
    id: "l2-stalking",
    level: 2,
    label: "Stalking",
    terms: [
      "gisunod-sunod", "gisundan", "gibantayan", "giatangan", "gi-stalk", "gistalk", "gisusi ang fb", "gisusi ang profile",
      "gi-chat balik-balik", "gi-message kanunay", "gi-spam", "gitawagan balik-balik", "gipangita ang balay",
      "giadto sa balay", "gikuhaan ug litrato nga wala nako nahibaw-an", "gi-video nga tago", "nahibaw-an asa ko puyo",
      "kahibalo ko asa ka", "nakita tika gahapon", "sinusundan", "sinundan", "sunod nang sunod", "binabantayan",
      "inaabangan", "minamanmanan", "ini-stalk", "inistalk", "tinitingnan ang fb", "chinachat nang paulit-ulit",
      "tinetext palagi", "sinispam", "tinatawagan palagi", "pinuntahan sa bahay", "alam ang bahay",
      "kinunan ng picture nang palihim", "vinideohan nang patago", "alam ko kung saan ka nakatira", "nakita kita kahapon",
    ],
    weak: ["sunod", "gi-screenshot", "gi-abangan"],
  },
  {
    id: "l2-catcalling",
    level: 2,
    label: "Catcalling, wolf-whistling, unwanted invitations, requests for personal details",
    terms: [
      "gisitsitan", "gitaghoyan", "gisipolan", "gi-catcall", "uy gwapa", "pa-kiss", "pa-hug", "sinitsitan", "sinipolan",
      "kinatcall", "gidapit bisan dili gusto", "gipugos ug date", "gipangayoan ug number", "unsa imong number",
      "asa ka puyo", "unsa imong fb", "gipangayo ang password", "padala ug picture", "gipugos pagpakigkita",
      "niyayaya kahit ayaw", "pinipilit makipag-date", "hinihingi ang number", "anong number mo", "saan ka nakatira",
      "anong fb mo", "hinihingi ang password", "pa-send ng pic", "pinipilit makipagkita",
    ],
    weak: ["sitsit", "sipol", "psst", "hi miss", "sexy", "chix", "chicks", "lami", "ganda", "sarap", "send pic"],
  },
  {
    id: "l2-slurs",
    level: 2,
    label: "Misogynistic, sexist, homophobic or transphobic slurs",
    terms: [
      "babaye ra ka", "babaye ra man", "bigaon", "kiringking", "landi", "kabit", "pang-babaye ra", "didto ra ka sa kusina",
      "babae ka lang", "malandi", "pokpok", "haliparot", "kerengkeng", "pambabae lang", "sa kusina ka lang", "bayot",
      "bayoti", "agi", "binabaye", "tibo", "lakin-on", "dili tinuod nga babaye", "lalaki gihapon ka", "gibayot-bayot",
      "bakla", "bading", "baklita", "binabae", "hindi ka tunay na babae", "lalaki ka pa rin", "binakla-bakla",
      "puta", "tomboy",
    ],
    weak: ["sakit ka", "may sakit ka", "salot"],
  },
  {
    id: "l2-appearance",
    level: 2,
    label: "Uninvited comments or gestures on appearance",
    terms: [
      "sexy kaayo", "kalami nimo", "gikomentohan ang lawas", "gitan-aw ang lawas", "gikindatan", "gi-body shame",
      "gidilaan ang ngabil", "ang sexy mo", "ang sarap mo", "kinomentohan ang katawan", "tinititigan ang katawan",
      "kinindatan", "binody shame", "dinilaan ang labi", "malaswang kumpas",
    ],
    weak: ["init kaayo", "kindat", "hot", "dagko kaayo imong", "ang laki ng"],
  },
  {
    id: "l2-sexual-comments",
    level: 2,
    label: "Sexual comments or suggestions",
    terms: [
      "manyak", "manyakis", "libog", "libogon", "hilas", "malaw-ay nga sulti", "nag-send ug malaw-ay nga picture",
      "gipakitaan ug bastos nga video", "nudes", "iyot", "malibog", "malaswa", "nag-send ng malaswang picture",
      "pinakitaan ng bastos na video", "pa-send ng nudes", "kantot",
    ],
    weak: ["sex", "bastos"],
  },
  {
    id: "l2-injury-words",
    level: 2,
    label: "Slight physical injury (injury words)",
    terms: [
      "nasamad", "samad", "nabun-og", "bun-og", "lagum", "pangos", "nagdugo", "nanghubag", "gikalot", "nasugatan",
      "sugat", "nagpasa", "namaga", "kinalmot", "napilay",
    ],
    weak: ["dugo", "bukol", "galos", "gasgas", "kalot", "pasa", "kalmot", "nabali"],
    floor: true,
  },
  {
    id: "l2-injury-actions",
    level: 2,
    label: "Assault (beating, stabbing-type actions)",
    terms: [
      "gibugbog", "gisumbag hangtod nagdugo", "gitusok ug ballpen", "gitusok ug lapis", "gilabay ug bato",
      "gitukmod sa hagdan", "gisampong sa bungbong", "binugbog", "ginulpi", "pinagsusuntok", "sinuntok hanggang dumugo",
      "tinusok ng ballpen", "tinusok ng lapis", "binato ng bato", "itinulak sa hagdan", "inuntog sa pader",
    ],
  },
  {
    id: "l2-theft",
    level: 2,
    label: "Theft or stealing belongings",
    terms: [
      "gikawat", "kawat", "kawatan", "nangawat", "gipangawat", "nikawat", "gikuhaan sa bag", "gikuhaan sa pitaka",
      "gibuksan ang bag", "nawala akong kwarta", "nawala akong baon", "nawala akong cellphone", "wala na nibalik",
      "gibaligya", "gipangilog", "ninakaw", "nakaw", "magnanakaw", "nagnakaw", "dinukot", "dukot", "kinupit", "kupit",
      "binuksan ang bag", "kinuha sa bag", "kinuha sa wallet", "kinuha sa pitaka", "nawala ang pera ko",
      "nawala ang baon ko", "nawala ang cellphone ko", "hindi na ibinalik", "ibinenta",
    ],
    weak: ["nawala", "nawad-an", "nawalan"],
  },
  {
    id: "l2-threat-phrases",
    level: 2,
    label: "Intimidating or threatening (threat phrases)",
    terms: [
      "patyon tika", "bunalan tika", "sumbagon tika", "kulatahon tika", "atangan tika", "humana ka", "andama ka",
      "makita ra nimo", "tan-awa lang", "ayaw pagsumbong", "ug musumbong ka", "ipahibalo nako sa tanan",
      "papatayin kita", "bubugbugin kita", "sasapakin kita", "abangan kita", "humanda ka", "lagot ka", "makikita mo",
      "tingnan natin", "subukan mong magsumbong", "pag nagsumbong ka", "ipagkakalat ko",
    ],
    floor: true,
  },
  {
    id: "l2-threat-actions",
    level: 2,
    label: "Intimidating or threatening (actions)",
    terms: [
      "gihulga", "hulga", "gipanghulga", "gihadlok", "gisukoan", "gitutokan", "gilibutan sa grupo", "binantaan", "banta",
      "tinakot", "sinindak", "tinitigan nang masama", "pinalibutan ng grupo",
    ],
    weak: ["gipugos", "pinilit"],
  },
  {
    // Kept from the original English-first heuristic so the fallback is no
    // less sensitive than it was before Cebuano/Tagalog lists existed.
    id: "l2-legacy-stems",
    level: 2,
    label: "Injury / theft / threat stems (English, Tagalog, Bisaya)",
    terms: [],
    stems: [
      "injur", "hurt", "bruis", "wound", "bleed", "bled", "swoll", "welt", "stole", "steal", "theft", "stolen", "threat",
      "stalk", "intimidat", "catcall", "wolf-whistl", "slur", "nasaktan", "sinaktan", "nasugatan", "sugat", "dugo",
      "ninakaw", "nakaw", "banta", "binanta", "pananakot", "nasamdan", "samad", "gikawat", "hulga", "gihulga",
    ],
  },

  // ---------------------------------------------------------------- Level 3
  {
    id: "l3-medical",
    level: 3,
    label: "Injury needing 10+ days or medical care (medical words)",
    terms: [
      "na-ospital", "gidala sa ospital", "gidala sa klinika", "na-confine", "na-admit", "gitahi", "gi-x-ray",
      "nabali ang bukog", "nasamdan pag-ayo", "grabe ang samad", "nawad-an ug panimuot", "nakuyapan", "nangabuhi pa",
      "dinala sa ospital", "dinala sa klinika", "tinahi", "na-x-ray", "nabalian ng buto", "malubhang sugat",
      "nawalan ng malay", "nahimatay", "nagpapagaling pa", "wala nakaskwela", "dugay wala nakaeskwela",
      "absent tungod sa samad", "hindi nakapasok", "matagal na absent", "absent dahil sa sugat",
    ],
    weak: ["tahi", "bali", "nagpahulay sa balay", "nagpapahinga sa bahay"],
    floor: true,
  },
  {
    id: "l3-severe-actions",
    level: 3,
    label: "Severe violence (ganging up, stabbing, blows to the head)",
    terms: [
      "gibugbog pag-ayo", "gikuyog-kuyog", "gidunggab", "gibunal ug kahoy", "gibunal ug bato", "gibunal ug silya",
      "gisipa sa ulo", "binugbog nang husto", "pinagtulungang bugbugin", "sinaksak", "hinampas ng kahoy",
      "hinampas ng bato", "hinampas ng upuan", "sinipa sa ulo",
    ],
    floor: true,
  },
  {
    id: "l3-lewd",
    level: 3,
    label: "Lewd gestures, exposure, groping",
    terms: [
      "gihikap", "gihikap ang lawas", "gikapkapan", "gihimas", "gigakos sa pugos", "gihalokan sa pugos",
      "gipakitaan sa iyang kinatawo", "gipakitaan sa iyang pribadong parte", "naghubo sa atubangan", "gipakita iyang lawas",
      "bastos nga lihok", "malaw-ay nga lihok", "nagbuhat ug kalaw-ayan", "gihikap ang pribadong parte",
      "gibitad ang sinina", "gibitad ang palda", "hinipuan", "hinipo", "hipo", "hinipo ang katawan", "kinapkapan",
      "hinimas", "niyakap nang pilit", "hinalikan nang pilit", "pinakitaan ng ari", "pinakitaan ng maselang bahagi",
      "naghubad sa harap ko", "ipinakita ang katawan", "malaswang kumpas", "bastos na galaw", "gumawa ng kalaswaan",
      "hinawakan ang maselang bahagi", "hinila ang damit", "hinila ang palda",
    ],
    weak: ["kapkap"],
    floor: true,
  },
  {
    id: "l3-shaming-media",
    level: 3,
    label: "Uploading/sharing videos that degrade or shame learners",
    terms: [
      "gi-video samtang gi-bully", "gi-video samtang naghilak", "gi-edit akong picture", "gipasa sa gc", "gi-tag ko",
      "gikataw-an sa comments", "gi-post para pakaulawan ko", "vinideohan habang binubully", "vinideohan habang umiiyak",
      "inedit ang picture ko", "ipinasa sa gc", "tinag ako", "pinagtawanan sa comments", "pinost para ipahiya ako",
    ],
    weak: [
      "gi-post", "gi-upload", "gi-share", "gipakaylap", "gi-live", "gi-myday", "gi-story", "nag-viral", "gihimong meme",
      "pinost", "in-upload", "shinare", "ikinalat", "nilive", "minyday", "ginawang meme",
    ],
    minMatches: 2,
    cyberAssisted: true,
    floor: true,
  },
  {
    id: "l3-sexual-content",
    level: 3,
    label: "Uploading/sharing sexual content of learners, including for money",
    terms: [
      "gi-post akong hubo nga picture", "gi-post akong hubo nga video", "gipakaylap akong malaw-ay nga picture",
      "gipasa sa uban akong pribadong picture", "gi-video ko samtang naligo", "gi-video ko samtang nag-ilis",
      "gi-record nga tago", "gipugos ko pagpadala ug picture", "gihulga nga i-post kung dili ko mosugot",
      "gibaligya akong picture", "gibaligya akong video", "gibayran para sa picture", "gitanyagan ug kwarta",
      "pinost ang hubad kong picture", "pinost ang hubad kong video", "ikinalat ang malaswa kong picture",
      "ipinasa sa iba ang pribado kong picture", "vinideohan ako habang naliligo", "vinideohan ako habang nagbibihis",
      "ni-record nang patago", "pinilit akong mag-send ng picture", "binantaang ipo-post kapag hindi ako pumayag",
      "ibinenta ang picture ko", "ibinenta ang video ko", "binayaran para sa picture", "inalok ng pera",
    ],
    floor: true,
  },
  {
    id: "l3-legacy-stems",
    level: 3,
    label: "Hospitalization / sexual-act stems (English, Tagalog, Bisaya)",
    terms: [],
    stems: [
      "10 days", "ten days", "incapacitat", "hospitaliz", "groping", "grope", "masturbat", "flashing", "flashed", "expos",
      "nude", "naked", "sexual", "molest", "ospital", "hubad", "hipo", "hinipo", "hubo", "hikap", "hinikap",
    ],
  },
];

// ---------------------------------------------------------------- Matching

// A report saying an act "did NOT result in injuries" still contains the
// substring "injur" — plain keyword matching would misclassify it. This
// checks a short window before each hit for a negation word (English,
// Tagalog "hindi"/"wala", Bisaya "dili"/"wala"/"walay") before counting it.
const NEGATION_PATTERN =
  /\b(no|not|never|without|nothing|none|n't|didn't|doesn't|does not|did not|hindi|wala|walang|dili|walay)\b[^.!?,;]{0,25}$/i;

// Lowercase, drop hyphens between letters ("gi-trip" == "gitrip"), turn other
// punctuation into spaces. Sentence and clause punctuation survives so the
// negation window above stops at the end of a clause ("...kung dili ko
// mosugot, gi-video ko..." must not negate the second clause).
function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/(\p{L})-(\p{L})/gu, "$1$2")
    .replace(/[^\p{L}\p{N}'\s.!?,;]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const matcherCache = new Map<string, RegExp>();

function wholeWordMatcher(term: string): RegExp {
  let matcher = matcherCache.get(term);
  if (!matcher) {
    const escaped = normalize(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    matcher = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "gu");
    matcherCache.set(term, matcher);
  }
  matcher.lastIndex = 0;
  return matcher;
}

function isNegated(text: string, index: number): boolean {
  return NEGATION_PATTERN.test(text.slice(Math.max(0, index - 40), index));
}

function hasWholeWord(text: string, term: string): boolean {
  const matcher = wholeWordMatcher(term);
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(text)) !== null) {
    if (!isNegated(text, match.index)) return true;
  }
  return false;
}

function hasStem(text: string, stem: string): boolean {
  let index = text.indexOf(stem);
  while (index !== -1) {
    if (!isNegated(text, index)) return true;
    index = text.indexOf(stem, index + 1);
  }
  return false;
}

export interface KeywordHit {
  categoryId: string;
  level: KeywordLevel;
  label: string;
  matched: string[];
  floor: boolean;
}

export function scanKeywords(description: string, opts: { cyberTagged?: boolean } = {}): KeywordHit[] {
  const text = normalize(description);
  if (!text) return [];

  const hits: KeywordHit[] = [];
  for (const category of KEYWORD_CATEGORIES) {
    const matchedStrong = category.terms.filter((t) => hasWholeWord(text, t));
    const matchedWeak = (category.weak ?? []).filter((t) => hasWholeWord(text, t));
    const matchedStems = (category.stems ?? []).filter((s) => hasStem(text, s));

    const score = matchedStrong.length + matchedStems.length + matchedWeak.length * 0.5;
    const needed = Math.max(1, (category.minMatches ?? 1) - (category.cyberAssisted && opts.cyberTagged ? 1 : 0));
    if (score < needed) continue;

    hits.push({
      categoryId: category.id,
      level: category.level,
      label: category.label,
      matched: [...matchedStrong, ...matchedStems, ...matchedWeak],
      floor: !!category.floor,
    });
  }
  return hits;
}

export function highestLevel(hits: KeywordHit[]): 0 | KeywordLevel {
  return hits.reduce<0 | KeywordLevel>((max, h) => (h.level > max ? h.level : max), 0);
}

// ---------------------------------------------------------------- For Claude

const LEVEL_NAMES: Record<KeywordLevel, string> = {
  1: "First Level (minor)",
  2: "Second Level (serious)",
  3: "Third Level (critical)",
};

// The reference list handed to Claude in the system prompt. Weak (everyday)
// words are listed too, marked, because slang and code-switching are exactly
// where a model needs the vocabulary.
export function buildKeywordGuide(): string {
  const lines: string[] = [];
  for (const level of [1, 2, 3] as const) {
    lines.push(`${LEVEL_NAMES[level]}:`);
    for (const c of KEYWORD_CATEGORIES.filter((k) => k.level === level && (k.terms.length || k.weak?.length))) {
      const weak = c.weak?.length ? ` | everyday words, weak evidence alone: ${c.weak.join(", ")}` : "";
      lines.push(`  - ${c.label}: ${c.terms.join(", ")}${weak}`);
    }
  }
  return lines.join("\n");
}

export function describeHits(hits: KeywordHit[]): string {
  if (!hits.length) return "none matched";
  return hits
    .map((h) => `${LEVEL_NAMES[h.level]} — ${h.label}: ${h.matched.slice(0, 5).map((m) => `"${m}"`).join(", ")}`)
    .join("; ");
}
