import type { Lang } from "@/lib/i18n";
import {
  getCharacterItemAvatarType,
  getCharacterItemSlot,
  type HeartShopCharacterItemId,
  type HeartShopCharacterSlot,
} from "@/lib/heartShopItems";
import type { RootsAvatarType } from "@/lib/avatar";

export type ProfileCharacterCategory =
  | "all"
  | "backgrounds"
  | "pets"
  | "tops"
  | "bottoms"
  | "shoes"
  | "eyewear"
  | "headwear"
  | "accessories"
  | "bags";

type ProfileCharacterLang = "ko" | "en" | "de" | "fr" | "es";

export type ProfileCharacterText = {
  previewLabel: string;
  restoreOutfitLabel: string;
  emptyTitle: string;
  emptyBody: string;
  openFullViewLabel: string;
  closeFullViewLabel: string;
  categories: Record<ProfileCharacterCategory, string>;
};

type WearableCharacterSlot = Exclude<HeartShopCharacterSlot, "background">;
type ItemNames = Record<RootsAvatarType, Record<WearableCharacterSlot, readonly string[]>>;

const TEXT: Record<ProfileCharacterLang, ProfileCharacterText> = {
  ko: {
    previewLabel: "미리보기",
    restoreOutfitLabel: "현재 코디로 복원",
    emptyTitle: "이 카테고리에는 아이템이 없어요",
    emptyBody: "다른 카테고리를 선택해보세요.",
    openFullViewLabel: "내 캐릭터 전체 보기",
    closeFullViewLabel: "캐릭터 전체 보기 닫기",
    categories: {
      all: "전체",
      backgrounds: "배경",
      pets: "반려동물",
      tops: "상의",
      bottoms: "하의",
      shoes: "신발",
      eyewear: "안경·선글라스",
      headwear: "모자",
      accessories: "헤어 액세서리",
      bags: "가방",
    },
  },
  en: {
    previewLabel: "Preview",
    restoreOutfitLabel: "Restore current outfit",
    emptyTitle: "No items in this category",
    emptyBody: "Try another category.",
    openFullViewLabel: "View my character",
    closeFullViewLabel: "Close character view",
    categories: {
      all: "All",
      backgrounds: "Backgrounds",
      pets: "Pets",
      tops: "Tops",
      bottoms: "Bottoms",
      shoes: "Shoes",
      eyewear: "Glasses & shades",
      headwear: "Hats",
      accessories: "Hair accessories",
      bags: "Bags",
    },
  },
  de: {
    previewLabel: "Vorschau",
    restoreOutfitLabel: "Aktuelles Outfit wiederherstellen",
    emptyTitle: "Keine Items in dieser Kategorie",
    emptyBody: "Wähle eine andere Kategorie.",
    openFullViewLabel: "Meinen Charakter ansehen",
    closeFullViewLabel: "Charakteransicht schließen",
    categories: {
      all: "Alle",
      backgrounds: "Hintergründe",
      pets: "Haustiere",
      tops: "Oberteile",
      bottoms: "Unterteile",
      shoes: "Schuhe",
      eyewear: "Brillen & Sonnenbrillen",
      headwear: "Mützen & Hüte",
      accessories: "Haarschmuck",
      bags: "Taschen",
    },
  },
  fr: {
    previewLabel: "Aperçu",
    restoreOutfitLabel: "Restaurer la tenue actuelle",
    emptyTitle: "Aucun objet dans cette catégorie",
    emptyBody: "Choisissez une autre catégorie.",
    openFullViewLabel: "Voir mon personnage",
    closeFullViewLabel: "Fermer la vue du personnage",
    categories: {
      all: "Tout",
      backgrounds: "Arrière-plans",
      pets: "Animaux",
      tops: "Hauts",
      bottoms: "Bas",
      shoes: "Chaussures",
      eyewear: "Lunettes",
      headwear: "Chapeaux",
      accessories: "Accessoires cheveux",
      bags: "Sacs",
    },
  },

  es: {
    previewLabel: "Vista previa",
    restoreOutfitLabel: "Restaurar atuendo actual",
    emptyTitle: "No hay objetos en esta categoría",
    emptyBody: "Prueba con otra categoría.",
    openFullViewLabel: "Ver mi personaje",
    closeFullViewLabel: "Cerrar vista del personaje",
    categories: {
      all: "Todo",
      backgrounds: "Fondos",
      pets: "Mascotas",
      tops: "Prendas superiores",
      bottoms: "Prendas inferiores",
      shoes: "Calzado",
      eyewear: "Gafas y lentes de sol",
      headwear: "Sombreros",
      accessories: "Accesorios para el cabello",
      bags: "Bolsos",
    },
  },
};

const BACKGROUND_NAMES: Record<ProfileCharacterLang, readonly string[]> = {
  ko: ["햇살 정원", "여름 바다", "포근한 책방", "노을빛 도시 옥상", "라벤더 별빛 밤", "고요한 교회", "스위스 알프스", "파리 에펠탑", "뉴욕 항구", "서울 한강", "런던 템스강", "산토리니 바다", "아프리카 초원", "시드니 항구", "예수님과 사진 찍기", "일본", "나는 예수님의 13번째 제자", "독일", "스페인", "부산"],
  en: ["Sunlit Garden", "Summer Beach", "Cozy Bookroom", "Sunset City Rooftop", "Lavender Starry Night", "Peaceful Church", "Swiss Alps", "Paris Eiffel Tower", "New York Harbor", "Seoul Han River", "London Thames", "Santorini Sea", "African Savanna", "Sydney Harbour", "Photo with Jesus", "Japan", "I Am Jesus’ 13th Disciple", "Germany", "Spain", "Busan"],
  de: ["Sonniger Garten", "Sommerstrand", "Gemütliches Bücherzimmer", "Dachterrasse bei Sonnenuntergang", "Lavendelfarbene Sternennacht", "Ruhiger Kirchenraum", "Schweizer Alpen", "Pariser Eiffelturm", "New Yorker Hafen", "Han-Fluss in Seoul", "Themse in London", "Santorini am Meer", "Afrikanische Savanne", "Hafen von Sydney", "Foto mit Jesus", "Japan", "Ich bin Jesu 13. Jünger", "Deutschland", "Spanien", "Busan"],
  fr: ["Jardin ensoleillé", "Plage d’été", "Bibliothèque chaleureuse", "Toit urbain au coucher du soleil", "Nuit étoilée lavande", "Église paisible", "Alpes suisses", "Tour Eiffel à Paris", "Port de New York", "Fleuve Han à Séoul", "Tamise à Londres", "Mer de Santorin", "Savane africaine", "Port de Sydney", "Photo avec Jésus", "Japon", "Je suis le 13e disciple de Jésus", "Allemagne", "Espagne", "Busan"],

  es: ["Jardín soleado", "Playa de verano", "Sala de lectura acogedora", "Azotea urbana al atardecer", "Noche estrellada lavanda", "Iglesia tranquila", "Alpes suizos", "Torre Eiffel de París", "Puerto de Nueva York", "Río Han de Seúl", "Río Támesis de Londres", "Mar de Santorini", "Sabana africana", "Puerto de Sídney", "Foto con Jesús", "Japón", "Soy el 13.º discípulo de Jesús", "Alemania", "España", "Busan"],
};

const ITEM_NAMES: Record<ProfileCharacterLang, ItemNames> = {
  ko: {
    rootsman: {
      pet: ["슈나우저", "비숑 프리제", "러시안 블루", "페르시안 고양이", "동키", "치치", "열무"],
      bottom: ["차콜 원턱 버뮤다", "연청 데님 버뮤다", "올리브 카고 쇼츠", "블랙 와이드 슬랙스", "에크루 스트레이트 치노", "인디고 와이드 데님", "라이트 워시 와이드 데님", "차콜 핀스트라이프 버뮤다", "워시드 블랙 와이드 데님", "올리브 와이드 카고 팬츠", "브라운 원턱 버뮤다", "차콜 워크 와이드 팬츠", "네이비 파이핑 스포츠 쇼츠", "샌드 베이지 카고 팬츠"],
      shoes: ["레트로 스니커즈", "실버 그레이 러너", "블랙 청키 로퍼", "새싹 하트 샌드 클로그", "브라운 보트 슈즈", "다크 브라운 페니 로퍼", "블랙 피셔맨 샌들", "세이지 레트로 러너"],
      top: ["오트밀 GRACE 맨투맨", "파우더 GOD IS GOOD 니트", "차콜 AMEN 후디", "세이지 JESUS IS LOVE 티", "네이비 십자가 폴로", "아이보리 캠프 셔츠", "오트밀 오픈 린넨 셔츠", "스카이 캠프 칼라 셔츠", "세이지 니트 오픈 폴로", "워시드 차콜 JESUS 티", "머스타드 케이블 니트 폴로", "버건디 크림 럭비 셔츠", "네이비 콘트라스트 워크 셔츠", "네이비 베이지 하프집업 아노락", "카멜 스웨이드 블루종", "딥 올리브 니트 집업", "워시드 차콜 트러커 재킷", "버건디 아가일 니트 베스트"],
      bag: [],
      eyewear: ["버건디 브로라인 안경", "네이비 라운드 안경", "브라운 스퀘어 안경", "블루 오벌 선글라스", "블랙 렉탱글 선글라스", "앰버 스퀘어 선글라스"],
      hair_accessory: [],
      headwear: ["라피아 네이비 버킷햇", "워시드 차콜 볼캡", "오트밀 뉴스보이캡", "딥 포레스트 비니"],
    },
    rootswoman: {
      pet: ["슈나우저", "비숑 프리제", "러시안 블루", "페르시안 고양이", "동키", "치치", "열무"],
      bottom: ["차콜 플리츠 미니스커트", "연청 테일러드 쇼츠", "아이보리 랩 미니스커트", "블랙 세미와이드 슬랙스", "다크 인디고 부츠컷 데님", "딥 네이비 맥시스커트", "크림 플리츠 와이드 팬츠", "블랙 슬림 카프리 팬츠", "스카이 돌핀 쇼츠", "아이보리 레이스 맥시스커트", "베리 핑크 턴업 쇼츠", "올리브 카고 버뮤다", "모카 브라운 스트링 쇼츠", "버터 옐로 도트 미디스커트", "워시드 차콜 배럴 데님", "브라운 코듀로이 플레어 팬츠", "플럼 드레이프 미디스커트", "베이지 체크 랩 미니스커트"],
      shoes: ["아이보리 핑크 레트로 스니커즈", "블랙 더블 스트랩 메리제인", "실버 라일락 러너", "버건디 페니 로퍼", "스카이 블루 레트로 스니커즈", "아이보리 메쉬 메리제인", "브라운 피셔맨 샌들", "버터 옐로 티스트랩 메리제인"],
      top: ["워시드 네이비 JESUS LOVES ME 티", "코랄 AMEN 카디건", "세이지 GOD IS GOOD 니트", "오트밀 하트 후디", "라벤더 JESUS 폴로", "차콜 GRACE 맨투맨", "아이보리 레이스 레이어드 블라우스", "버터 옐로 로맨틱 블라우스", "네이비 블록코어 풋볼 저지", "워시드 데님 크롭 베스트 레이어드", "스카이 블루 벨티드 셔츠 원피스", "네이비 피터팬 칼라 원피스", "스카이 블루 랩 리본 블라우스", "코랄 플라워 페플럼 블라우스", "아이보리 퍼프 블라우스", "블루 니트 칼라 톱", "핑크 리본 티", "베이지 더블 버튼 재킷", "브라운 크롭 재킷 리본 블라우스", "차콜 크롭 카디건 퍼플 니트", "블랙 크롭 봄버 버건디 니트", "크림 케이블 카디건 스트라이프 셔츠", "딥 그린 코듀로이 멜빵 원피스", "버건디 트위드 크롭 재킷", "하운드투스 피터팬 칼라 원피스", "포레스트 세일러 칼라 케이블 니트", "아이스 블루 노르딕 니트"],
      bag: ["블랙 컴팩트 크레센트 크로스백", "버건디 미니 크로스백", "블랙 스트럭처드 핸드백", "아이보리 미니 보스턴백"],
      eyewear: ["로즈 캣아이 안경", "라벤더 라운드 안경", "골드 라운드 스퀘어 안경", "아이보리 캣아이 선글라스", "레드 하트 선글라스", "라일락 오버사이즈 선글라스"],
      hair_accessory: ["아이보리 리본 헤어핀", "진주 플라워 헤어핀", "블랙 벨벳 리본 헤어핀", "슬림 펄 헤어밴드", "블랙 패디드 헤어밴드", "더스티 핑크 트위스트 헤어밴드"],
      headwear: ["아이보리 리본 클로슈", "네이비 하트 볼캡", "차콜 플라워 베레", "라벤더 데이지 버킷햇"],
    },
  },
  en: {
    rootsman: {
      pet: ["Schnauzer", "Bichon Frise", "Russian Blue", "Persian Cat", "Donki", "Chichi", "Yeolmu"],
      bottom: ["Charcoal Bermuda Shorts", "Light-Wash Denim Bermudas", "Olive Cargo Shorts", "Black Wide Slacks", "Ecru Straight Chinos", "Indigo Wide Denim", "Light-Wash Wide Denim", "Charcoal Pinstripe Bermudas", "Washed Black Wide Denim", "Olive Wide Cargo Pants", "Brown Pleated Bermudas", "Charcoal Wide Work Pants", "Navy Piped Sport Shorts", "Sand Beige Cargo Pants"],
      shoes: ["Retro Sneakers", "Silver Gray Runners", "Black Chunky Loafers", "Sprout Heart Sand Clogs", "Brown Boat Shoes", "Dark Brown Penny Loafers", "Black Fisherman Sandals", "Sage Retro Runners"],
      top: ["Oatmeal GRACE Sweatshirt", "Powder GOD IS GOOD Knit", "Charcoal AMEN Hoodie", "Sage JESUS IS LOVE Tee", "Navy Cross Polo", "Ivory Camp Shirt", "Oatmeal Open Linen Shirt", "Sky Camp-Collar Shirt", "Sage Knit Open Polo", "Washed Charcoal JESUS Tee", "Mustard Cable-Knit Polo", "Burgundy Cream Rugby Shirt", "Navy Contrast Work Shirt", "Navy Beige Half-Zip Anorak", "Camel Suede Blouson", "Deep Olive Knit Zip-Up", "Washed Charcoal Trucker Jacket", "Burgundy Argyle Knit Vest"],
      bag: [],
      eyewear: ["Burgundy Browline Glasses", "Navy Round Glasses", "Brown Square Glasses", "Blue Oval Sunglasses", "Black Rectangle Sunglasses", "Amber Square Sunglasses"],
      hair_accessory: [],
      headwear: ["Raffia Navy Bucket Hat", "Washed Charcoal Cap", "Oatmeal Newsboy Cap", "Deep Forest Beanie"],
    },
    rootswoman: {
      pet: ["Schnauzer", "Bichon Frise", "Russian Blue", "Persian Cat", "Donki", "Chichi", "Yeolmu"],
      bottom: ["Charcoal Pleated Mini", "Light-Wash Tailored Shorts", "Ivory Wrap Mini", "Black Semi-Wide Slacks", "Dark Indigo Bootcut Denim", "Deep Navy Maxi Skirt", "Cream Pleated Wide Pants", "Black Slim Capri Pants", "Sky Blue Dolphin Shorts", "Ivory Lace Maxi Skirt", "Berry Pink Turn-Up Shorts", "Olive Cargo Bermudas", "Mocha Brown Drawstring Shorts", "Butter Yellow Polka-Dot Midi Skirt", "Washed Charcoal Barrel Jeans", "Brown Corduroy Flare Pants", "Plum Draped Midi Skirt", "Beige Plaid Wrap Mini Skirt"],
      shoes: ["Ivory Pink Retro Sneakers", "Black Double-Strap Mary Janes", "Silver Lilac Runners", "Burgundy Penny Loafers", "Sky Blue Retro Sneakers", "Ivory Mesh Mary Janes", "Brown Fisherman Sandals", "Butter Yellow T-Strap Mary Janes"],
      top: ["Navy JESUS LOVES ME Tee", "Coral AMEN Cardigan", "Sage GOD IS GOOD Knit", "Oatmeal Heart Hoodie", "Lavender JESUS Polo", "Charcoal GRACE Sweatshirt", "Ivory Lace Layered Blouse", "Butter Yellow Romantic Blouse", "Navy Blockcore Football Jersey", "Washed Denim Cropped Layered Vest", "Sky Blue Belted Shirt Dress", "Navy Peter Pan Collar Dress", "Sky Blue Wrap-Tie Blouse", "Coral Floral Peplum Blouse", "Ivory Puff Blouse", "Blue Knit Collar Top", "Pink Ribbon Tee", "Beige Double-Button Jacket", "Brown Cropped Jacket & Bow Blouse", "Charcoal Cropped Cardigan & Purple Knit", "Black Cropped Bomber & Burgundy Knit", "Cream Cable Cardigan & Striped Shirt", "Deep Green Corduroy Pinafore Dress", "Burgundy Tweed Cropped Jacket", "Houndstooth Peter Pan Collar Dress", "Forest Sailor-Collar Cable Knit", "Ice Blue Nordic Knit"],
      bag: ["Black Compact Crescent Crossbody", "Burgundy Mini Crossbody", "Black Structured Handbag", "Ivory Mini Boston Bag"],
      eyewear: ["Rose Cat-Eye Glasses", "Lavender Round Glasses", "Gold Rounded-Square Glasses", "Ivory Cat-Eye Sunglasses", "Red Heart Sunglasses", "Lilac Oversized Sunglasses"],
      hair_accessory: ["Ivory Bow Hair Clip", "Pearl Flower Barrette", "Black Velvet Bow Hair Clip", "Slim Pearl Headband", "Black Padded Headband", "Dusty Pink Twist Headband"],
      headwear: ["Ivory Ribbon Cloche", "Navy Heart Cap", "Charcoal Flower Beret", "Lavender Daisy Bucket Hat"],
    },
  },
  de: {
    rootsman: {
      pet: ["Schnauzer", "Bichon Frisé", "Russisch Blau", "Perserkatze", "Donki", "Chichi", "Yeolmu"],
      bottom: ["Anthrazit-Bermudas", "Helle Denim-Bermudas", "Olivgrüne Cargo-Shorts", "Schwarze weite Hose", "Ecru-Chinos", "Weite Indigo-Jeans", "Helle Wide-Leg-Jeans", "Anthrazitfarbene Nadelstreifen-Bermudas", "Verwaschene schwarze Wide-Leg-Jeans", "Olivgrüne weite Cargohose", "Braune Bundfalten-Bermudas", "Anthrazitfarbene weite Workwear-Hose", "Marineblaue Sportshorts mit Paspeln", "Sandbeige Cargohose"],
      shoes: ["Retro-Sneaker", "Silbergraue Laufschuhe", "Schwarze Chunky-Loafer", "Sand-Clogs mit Herz", "Braune Bootsschuhe", "Dunkelbraune Pennyloafer", "Schwarze Fisherman-Sandalen", "Retro-Sneaker in Salbei"],
      top: ["GRACE-Sweatshirt in Oatmeal", "GOD IS GOOD Strickpullover", "AMEN-Hoodie in Anthrazit", "JESUS IS LOVE Shirt in Salbei", "Marineblaues Kreuz-Polo", "Elfenbeinfarbenes Camp-Shirt", "Offenes Leinenhemd in Oatmeal", "Himmelblaues Camp-Kragen-Hemd", "Offenes Strickpolo in Salbei", "Verwaschenes JESUS-Shirt in Anthrazit", "Senfgelbes Kabelstrick-Polo", "Burgunder-Creme Rugbyshirt", "Marineblaues Kontrast-Workshirt", "Marineblau-beiger Half-Zip-Anorak", "Kamelbrauner Wildleder-Blouson", "Dunkeloliver Strickcardigan mit Reißverschluss", "Anthrazitfarbene Truckerjacke im Washed-Look", "Burgunderroter Argyle-Strickpullunder"],
      bag: [],
      eyewear: ["Burgunder Browline-Brille", "Runde marineblaue Brille", "Braune eckige Brille", "Blaue ovale Sonnenbrille", "Schwarze rechteckige Sonnenbrille", "Bernsteinfarbene Sonnenbrille"],
      hair_accessory: [],
      headwear: ["Raffia-Bucket-Hat", "Anthrazitfarbene Kappe", "Oatmeal-Schiebermütze", "Waldgrüne Beanie"],
    },
    rootswoman: {
      pet: ["Schnauzer", "Bichon Frisé", "Russisch Blau", "Perserkatze", "Donki", "Chichi", "Yeolmu"],
      bottom: ["Anthrazitfarbener Faltenrock", "Helle Tailored Shorts", "Elfenbeinfarbener Wickelrock", "Schwarze Semi-Wide-Hose", "Dunkle Bootcut-Jeans", "Marineblauer Maxirock", "Cremefarbene weite Faltenhose", "Schwarze schmale Caprihose", "Himmelblaue Dolphin-Shorts", "Elfenbeinfarbener Spitzen-Maxirock", "Berryrosa Shorts mit Umschlag", "Olivgrüne Cargo-Bermudas", "Mokkabraune Shorts mit Kordelzug", "Buttergelber Midirock mit Punkten", "Verwaschene anthrazitfarbene Barrel-Jeans", "Braune Cordhose mit Schlag", "Pflaumenfarbener drapierter Midirock", "Beiger karierter Wickel-Minirock"],
      shoes: ["Retro-Sneaker in Elfenbeinrosa", "Schwarze Mary Janes", "Silber-lilafarbene Laufschuhe", "Burgunderfarbene Pennyloafer", "Himmelblaue Retro-Sneaker", "Elfenbeinfarbene Mesh-Mary-Janes", "Braune Fisherman-Sandalen", "Buttergelbe Mary Janes mit T-Riemen"],
      top: ["JESUS LOVES ME Shirt in Navy", "AMEN-Cardigan in Koralle", "GOD IS GOOD Strick in Salbei", "Oatmeal-Herz-Hoodie", "JESUS-Polo in Lavendel", "GRACE-Sweatshirt in Anthrazit", "Elfenbeinfarbene Spitzen-Layering-Bluse", "Buttergelbe romantische Bluse", "Marineblaues Blockcore-Footballtrikot", "Cropped Layering-Weste aus verwaschenem Denim", "Himmelblaues Hemdblusenkleid mit Gürtel", "Marineblaues Kleid mit Bubikragen", "Himmelblaue Wickelbluse mit Bindeband", "Korallfarbene Blumen-Peplumbluse", "Elfenbeinfarbene Puffbluse", "Blaues Stricktop mit Kragen", "Rosa T-Shirt mit Schleife", "Beige Jacke mit Doppelknopfleiste", "Braune Cropped-Jacke mit Schleifenbluse", "Anthrazitfarbener Cropped-Cardigan mit lila Stricktop", "Schwarze Cropped-Bomberjacke mit burgunderrotem Stricktop", "Cremefarbener Zopfstrick-Cardigan mit Streifenhemd", "Dunkelgrünes Cord-Latzkleid", "Burgunderrote kurze Tweedjacke", "Hahnentritt-Kleid mit Bubikragen", "Waldgrüner Zopfstrickpullover mit Matrosenkragen", "Eisblauer Norwegerpullover"],
      bag: ["Kompakte schwarze Halbmond-Umhängetasche", "Burgunderrote Mini-Umhängetasche", "Schwarze strukturierte Handtasche", "Elfenbeinfarbene Mini-Boston-Tasche"],
      eyewear: ["Roséfarbene Cateye-Brille", "Runde Lavendel-Brille", "Goldene Rundquadrat-Brille", "Elfenbeinfarbene Cateye-Sonnenbrille", "Rote Herz-Sonnenbrille", "Große lilafarbene Sonnenbrille"],
      hair_accessory: ["Elfenbeinfarbene Schleifen-Haarspange", "Haarspange mit Perlenblume", "Schwarze Samt-Schleifen-Haarspange", "Schmaler Perlen-Haarreif", "Schwarzer gepolsterter Haarreif", "Altrosa Twist-Haarreif"],
      headwear: ["Elfenbeinfarbener Glockenhut", "Marineblaue Herz-Kappe", "Anthrazit-Baskenmütze mit Blume", "Lavendel-Bucket-Hat mit Gänseblümchen"],
    },
  },
  fr: {
    rootsman: {
      pet: ["Schnauzer", "Bichon frisé", "Bleu russe", "Chat persan", "Donki", "Chichi", "Yeolmu"],
      bottom: ["Bermuda anthracite", "Bermuda en denim clair", "Short cargo olive", "Pantalon large noir", "Chino droit écru", "Jean large indigo", "Jean large bleu clair délavé", "Bermuda anthracite à fines rayures", "Jean large noir délavé", "Pantalon cargo large olive", "Bermuda marron à plis", "Pantalon de travail large anthracite", "Short de sport marine à passepoils", "Pantalon cargo beige sable"],
      shoes: ["Baskets rétro", "Baskets argent et gris", "Mocassins noirs épais", "Sabots sable cœur et pousse", "Chaussures bateau marron", "Mocassins penny brun foncé", "Sandales pêcheur noires", "Baskets rétro sauge"],
      top: ["Sweat GRACE avoine", "Pull GOD IS GOOD poudré", "Sweat à capuche AMEN anthracite", "T-shirt JESUS IS LOVE sauge", "Polo croix marine", "Chemise camp ivoire", "Chemise ouverte en lin avoine", "Chemise col cubain bleu ciel", "Polo ouvert en maille sauge", "T-shirt JESUS anthracite délavé", "Polo en maille torsadée moutarde", "Maillot de rugby bordeaux et crème", "Chemise de travail marine contrastée", "Anorak demi-zip marine et beige", "Blouson en daim camel", "Gilet zippé en maille olive foncé", "Veste trucker anthracite délavée", "Pull sans manches argyle bordeaux"],
      bag: [],
      eyewear: ["Lunettes browline bordeaux", "Lunettes rondes marine", "Lunettes carrées brunes", "Lunettes de soleil ovales bleues", "Lunettes de soleil rectangulaires noires", "Lunettes de soleil carrées ambre"],
      hair_accessory: [],
      headwear: ["Bob raphia marine", "Casquette anthracite délavée", "Casquette gavroche avoine", "Bonnet vert forêt"],
    },
    rootswoman: {
      pet: ["Schnauzer", "Bichon frisé", "Bleu russe", "Chat persan", "Donki", "Chichi", "Yeolmu"],
      bottom: ["Minijupe plissée anthracite", "Short ajusté en denim clair", "Minijupe portefeuille ivoire", "Pantalon semi-large noir", "Jean bootcut indigo foncé", "Jupe longue bleu marine", "Pantalon large plissé crème", "Pantacourt slim noir", "Short dolphin bleu ciel", "Jupe longue ivoire en dentelle", "Short rose baie à revers", "Bermuda cargo olive", "Short marron moka à cordon", "Jupe midi jaune beurre à pois", "Jean barrel anthracite délavé", "Pantalon évasé en velours côtelé brun", "Jupe midi drapée prune", "Minijupe portefeuille à carreaux beige"],
      shoes: ["Baskets rétro ivoire et rose", "Mary Janes noires à double bride", "Baskets argent et lilas", "Mocassins bordeaux", "Baskets rétro bleu ciel", "Mary Janes ivoire en résille", "Sandales pêcheur brunes", "Mary Janes jaune beurre à bride en T"],
      top: ["T-shirt JESUS LOVES ME marine", "Cardigan AMEN corail", "Pull GOD IS GOOD sauge", "Sweat à capuche cœur avoine", "Polo JESUS lavande", "Sweat GRACE anthracite", "Blouse ivoire superposée en dentelle", "Blouse romantique jaune beurre", "Maillot de football blockcore marine", "Gilet court superposé en denim délavé", "Robe chemise bleu ciel ceinturée", "Robe marine à col Claudine", "Blouse portefeuille bleu ciel à nouer", "Blouse péplum corail à fleurs", "Blouse ivoire à manches bouffantes", "Haut en maille bleu à col", "T-shirt rose à nœud", "Veste beige à double boutonnage", "Veste courte brune et blouse à nœud", "Cardigan court anthracite et maille violette", "Bomber court noir et maille bordeaux", "Cardigan torsadé crème et chemise rayée", "Robe chasuble en velours côtelé vert forêt", "Veste courte en tweed bordeaux", "Robe pied-de-poule à col Claudine", "Pull torsadé vert forêt à col marin", "Pull nordique bleu glacier"],
      bag: ["Petit sac bandoulière demi-lune noir", "Mini sac bandoulière bordeaux", "Sac à main structuré noir", "Mini sac Boston ivoire"],
      eyewear: ["Lunettes œil-de-chat roses", "Lunettes rondes lavande", "Lunettes carrées arrondies dorées", "Lunettes de soleil œil-de-chat ivoire", "Lunettes de soleil cœur rouges", "Lunettes de soleil lilas oversize"],
      hair_accessory: ["Barrette nœud ivoire", "Barrette fleur perlée", "Barrette nœud en velours noir", "Serre-tête fin perlé", "Serre-tête rembourré noir", "Serre-tête torsadé rose poudré"],
      headwear: ["Cloche ivoire à ruban", "Casquette cœur marine", "Béret anthracite à fleur", "Bob lavande à marguerites"],
    },
  },

  es: {
    rootsman: {
      pet: ["Schnauzer", "Bichón frisé", "Azul ruso", "Gato persa", "Donki", "Chichi", "Yeolmu"],
      bottom: ["Bermudas color carbón con pinza", "Bermudas de mezclilla clara", "Shorts cargo verde oliva", "Pantalón sastre negro de pierna ancha", "Chinos rectos color crudo", "Jeans anchos índigo", "Jeans anchos de lavado claro", "Bermudas color carbón a rayas finas", "Jeans anchos negros desgastados", "Pantalón cargo ancho verde oliva", "Bermudas marrón con pinzas", "Pantalón de trabajo ancho color carbón", "Shorts deportivos azul marino con vivos", "Pantalón cargo beige arena"],
      shoes: ["Tenis retro", "Tenis runner gris plata", "Mocasines chunky negros", "Zuecos arena con corazón y brote", "Zapatos náuticos marrones", "Mocasines penny marrón oscuro", "Sandalias pescador negras", "Tenis runner retro verde salvia"],
      top: ["Sudadera GRACE color avena", "Suéter GOD IS GOOD en tono empolvado", "Sudadera con capucha AMEN color carbón", "Camiseta JESUS IS LOVE verde salvia", "Polo azul marino con cruz", "Camisa camp marfil", "Camisa abierta de lino color avena", "Camisa celeste con cuello camp", "Polo abierto tejido verde salvia", "Camiseta JESUS color carbón desgastado", "Polo de punto trenzado mostaza", "Camisa de rugby borgoña y crema", "Camisa de trabajo azul marino con contraste", "Anorak medio cierre azul marino y beige", "Cazadora de ante color camel", "Cárdigan tejido con cremallera verde oliva oscuro", "Chaqueta trucker color carbón desgastado", "Chaleco tejido de rombos borgoña"],
      bag: [],
      eyewear: ["Gafas browline borgoña", "Gafas redondas azul marino", "Gafas cuadradas marrones", "Lentes de sol ovalados azules", "Lentes de sol rectangulares negros", "Lentes de sol cuadrados ámbar"],
      hair_accessory: [],
      headwear: ["Sombrero bucket de rafia azul marino", "Gorra color carbón desgastado", "Gorra newsboy color avena", "Gorro tejido verde bosque"],
    },
    rootswoman: {
      pet: ["Schnauzer", "Bichón frisé", "Azul ruso", "Gato persa", "Donki", "Chichi", "Yeolmu"],
      bottom: ["Minifalda plisada color carbón", "Shorts sastre de mezclilla clara", "Minifalda cruzada marfil", "Pantalón sastre negro semiancho", "Jeans bootcut índigo oscuro", "Falda maxi azul marino intenso", "Pantalón ancho plisado crema", "Pantalón capri negro ajustado", "Shorts dolphin celestes", "Falda maxi de encaje marfil", "Shorts rosa baya con vuelta", "Bermudas cargo verde oliva", "Shorts marrón moca con cordón", "Falda midi amarilla mantequilla con lunares", "Jeans barrel color carbón desgastado", "Pantalón acampanado de pana marrón", "Falda midi drapeada color ciruela", "Minifalda cruzada de cuadros beige"],
      shoes: ["Tenis retro marfil y rosa", "Mary Janes negras de doble correa", "Tenis runner plata y lila", "Mocasines penny borgoña", "Tenis retro celestes", "Mary Janes de malla marfil", "Sandalias pescador marrones", "Mary Janes amarillas con correa en T"],
      top: ["Camiseta JESUS LOVES ME azul marino", "Cárdigan AMEN coral", "Suéter GOD IS GOOD verde salvia", "Sudadera con capucha de corazón color avena", "Polo JESUS lavanda", "Sudadera GRACE color carbón", "Blusa de encaje en capas marfil", "Blusa romántica amarilla mantequilla", "Camiseta de fútbol blockcore azul marino", "Chaleco corto en capas de mezclilla desgastada", "Vestido camisero celeste con cinturón", "Vestido azul marino con cuello Peter Pan", "Blusa cruzada celeste con lazo", "Blusa peplum coral con flores", "Blusa marfil de mangas abullonadas", "Top tejido azul con cuello", "Camiseta rosa con lazo", "Chaqueta beige de doble botonadura", "Chaqueta corta marrón y blusa con lazo", "Cárdigan corto color carbón y tejido morado", "Bomber corta negra y tejido borgoña", "Cárdigan de ochos crema y camisa de rayas", "Vestido pichi de pana verde bosque", "Chaqueta corta de tweed borgoña", "Vestido pata de gallo con cuello Peter Pan", "Suéter trenzado verde bosque con cuello marinero", "Suéter nórdico azul hielo"],
      bag: ["Bolso bandolera compacto de media luna negro", "Mini bolso bandolera borgoña", "Bolso de mano estructurado negro", "Mini bolso Boston marfil"],
      eyewear: ["Gafas cat-eye rosa", "Gafas redondas lavanda", "Gafas cuadradas redondeadas doradas", "Lentes de sol cat-eye marfil", "Lentes de sol rojos de corazón", "Lentes de sol lila oversize"],
      hair_accessory: ["Pasador de lazo marfil", "Pasador de flor con perlas", "Pasador de lazo de terciopelo negro", "Diadema fina de perlas", "Diadema acolchada negra", "Diadema trenzada rosa empolvado"],
      headwear: ["Sombrero cloche marfil con lazo", "Gorra azul marino con corazón", "Boina color carbón con flor", "Sombrero bucket lavanda con margaritas"],
    },
  },
};

function normalizeLang(lang: Lang | string): ProfileCharacterLang {
  return lang === "en" || lang === "de" || lang === "fr" || lang === "es" ? lang : "ko";
}

export function getProfileCharacterText(lang: Lang | string): ProfileCharacterText {
  return TEXT[normalizeLang(lang)];
}

export function getProfileCharacterItemText(itemId: HeartShopCharacterItemId, lang: Lang | string) {
  const normalizedLang = normalizeLang(lang);
  const avatarType = getCharacterItemAvatarType(itemId);
  const slot = getCharacterItemSlot(itemId);
  const itemIndex = Math.max(0, Number(itemId.slice(-2)) - 1);

  if (slot === "background") {
    return {
      name: BACKGROUND_NAMES[normalizedLang][itemIndex] || `${TEXT[normalizedLang].categories.backgrounds} ${itemIndex + 1}`,
      description: TEXT[normalizedLang].categories.backgrounds,
    };
  }

  const categoryBySlot: Record<HeartShopCharacterSlot, ProfileCharacterCategory> = {
    background: "backgrounds",
    pet: "pets",
    bottom: "bottoms",
    shoes: "shoes",
    top: "tops",
    bag: "bags",
    eyewear: "eyewear",
    hair_accessory: "accessories",
    headwear: "headwear",
  };
  const category = categoryBySlot[slot];
  const wearableAvatarType: RootsAvatarType = avatarType === "rootswoman" ? "rootswoman" : "rootsman";
  return {
    name: ITEM_NAMES[normalizedLang][wearableAvatarType][slot][itemIndex] || `${TEXT[normalizedLang].categories[category]} ${itemIndex + 1}`,
    description: TEXT[normalizedLang].categories[category],
  };
}
