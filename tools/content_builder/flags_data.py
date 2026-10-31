# tools/content_builder/flags_data.py: 20 Countries, Flags, Facts, and Verified Teacher Descriptions

MODULE_FLAGS = {
    "moduleId": "flags-basics",
    "subject": "geography_flags",
    "title": "География: страны и флаги",
    "contentVersion": "v1",
    "teacherId": "teacher-flags",
    "examinerId": "examiner-flags"
}

COUNTRIES = [
    {
        "countryId": "country-jp",
        "wikidataId": "Q17",
        "nameRu": "Япония",
        "acceptedNames": ["Япония", "Japan", "Государство Япония"],
        "capitalRu": "Токио",
        "flagVisibleElements": "Белое прямоугольное полотнище с ярко-красным круглым диском в центре.",
        "descriptionSentences": [
            "Япония — островное государство в Восточной Азии, расположенное в Тихом океане.",
            "Столицей страны является город Токио.",
            "Территория страны включает более четырнадцати тысяч островов, а высочайшей вершиной служит вулкан Фудзияма.",
            "Государственный флаг представляет собой белое полотнище с красным кругом в центре."
        ],
        "factIds": ["fact-jp-loc", "fact-jp-cap", "fact-jp-geo", "fact-jp-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="900" height="600"><rect width="900" height="600" fill="#ffffff"/><circle cx="450" cy="300" r="180" fill="#bc002d"/></svg>',
        "distractors": ["Китай", "Республика Корея", "Вьетнам"]
    },
    {
        "countryId": "country-fr",
        "wikidataId": "Q142",
        "nameRu": "Франция",
        "acceptedNames": ["Франция", "France", "Французская Республика"],
        "capitalRu": "Париж",
        "flagVisibleElements": "Три вертикальные полосы одинаковой ширины синего, белого и красного цветов.",
        "descriptionSentences": [
            "Франция — государство в Западной Европе с выходом к Атлантическому океану и Средиземному морю.",
            "Её столицей и крупнейшим историческим центром является Париж.",
            "На территории страны расположены западные склоны Альп с вершиной Монблан.",
            "Флаг страны состоит из трех вертикальных полос синего, белого и красного цвета."
        ],
        "factIds": ["fact-fr-loc", "fact-fr-cap", "fact-fr-geo", "fact-fr-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="900" height="600"><rect width="300" height="600" fill="#002654"/><rect x="300" width="300" height="600" fill="#ffffff"/><rect x="600" width="300" height="600" fill="#ce1126"/></svg>',
        "distractors": ["Италия", "Нидерланды", "Бельгия"]
    },
    {
        "countryId": "country-br",
        "wikidataId": "Q155",
        "nameRu": "Бразилия",
        "acceptedNames": ["Бразилия", "Brazil", "Федеративная Республика Бразилия"],
        "capitalRu": "Бразилиа",
        "flagVisibleElements": "Зелёное полотнище с жёлтым ромбом в центре и синим кругом со звёздами и белой лентой.",
        "descriptionSentences": [
            "Бразилия — крупнейшее государство Южной Америки, занимающее почти половину материка.",
            "Официальной столицей государства является город Бразилиа.",
            "Здесь протекает река Амазонка и раскинулся крупнейший в мире массив тропических дождевых лесов.",
            "Флаг страны имеет зеленое поле с желтым ромбом и синим небесным кругом."
        ],
        "factIds": ["fact-br-loc", "fact-br-cap", "fact-br-geo", "fact-br-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="1000" height="700"><rect width="1000" height="700" fill="#009c3b"/><polygon points="500,83 917,350 500,617 83,350" fill="#ffdf00"/><circle cx="500" cy="350" r="175" fill="#002776"/><path d="M 330,370 Q 500,320 670,370" stroke="#ffffff" stroke-width="25" fill="none"/></svg>',
        "distractors": ["Аргентина", "Колумбия", "Перу"]
    }
]
COUNTRIES.extend([
    {
        "countryId": "country-ca",
        "wikidataId": "Q16",
        "nameRu": "Канада",
        "acceptedNames": ["Канада", "Canada"],
        "capitalRu": "Оттава",
        "flagVisibleElements": "Две красные вертикальные полосы по краям, белый центральный квадрат с красным одиннадцатиконечным кленовым листом.",
        "descriptionSentences": [
            "Канада — второе по площади государство мира, расположенное в Северной Америке.",
            "Столицей страны является город Оттава.",
            "Страна обладает самой протяженной береговой линией в мире и омывается тремя океанами.",
            "На государственном флаге изображен красный одиннадцатиконечный кленовый лист на белом фоне."
        ],
        "factIds": ["fact-ca-loc", "fact-ca-cap", "fact-ca-geo", "fact-ca-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" width="1000" height="500"><rect width="250" height="500" fill="#d80621"/><rect x="250" width="500" height="500" fill="#ffffff"/><rect x="750" width="250" height="500" fill="#d80621"/><path d="M 500,100 L 520,190 L 580,160 L 560,220 L 610,240 L 570,270 L 580,310 L 530,290 L 520,330 L 505,330 L 505,400 L 495,400 L 495,330 L 480,330 L 470,290 L 420,310 L 430,270 L 390,240 L 440,220 L 420,160 L 480,190 Z" fill="#d80621"/></svg>',
        "distractors": ["США", "Австралия", "Великобритания"]
    },
    {
        "countryId": "country-de",
        "wikidataId": "Q183",
        "nameRu": "Германия",
        "acceptedNames": ["Германия", "Germany", "Федеративная Республика Германия"],
        "capitalRu": "Берлин",
        "flagVisibleElements": "Три горизонтальные равновеликие полосы чёрного, красного и золотистого (жёлтого) цветов.",
        "descriptionSentences": [
            "Германия — федеративное государство, расположенное в Центральной Европе.",
            "Столицей и крупнейшим мегаполисом страны является Берлин.",
            "Рельеф повышается с севера на юг от Северо-Германской низменности к отрогам Альп.",
            "Флаг представляет собой горизонтальный триколор из черной, красной и золотой полос."
        ],
        "factIds": ["fact-de-loc", "fact-de-cap", "fact-de-geo", "fact-de-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" width="1000" height="600"><rect width="1000" height="200" fill="#000000"/><rect y="200" width="1000" height="200" fill="#dd0000"/><rect y="400" width="1000" height="200" fill="#ffce00"/></svg>',
        "distractors": ["Бельгия", "Австрия", "Польша"]
    },
    {
        "countryId": "country-it",
        "wikidataId": "Q38",
        "nameRu": "Италия",
        "acceptedNames": ["Италия", "Italy", "Итальянская Республика"],
        "capitalRu": "Рим",
        "flagVisibleElements": "Три вертикальные полосы равной ширины: зелёная у древка, белая в центре и красная у свободного края.",
        "descriptionSentences": [
            "Италия — государство на юге Европы, занимающее Апеннинский полуостров и острова Сицилия и Сардиния.",
            "Её исторической столицей является Рим.",
            "На территории страны расположены действующие вулканы Везувий и Этна.",
            "Флаг государства состоит из трех вертикальных полос зеленого, белого и красного цветов."
        ],
        "factIds": ["fact-it-loc", "fact-it-cap", "fact-it-geo", "fact-it-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="900" height="600"><rect width="300" height="600" fill="#009246"/><rect x="300" width="300" height="600" fill="#ffffff"/><rect x="600" width="300" height="600" fill="#ce2b37"/></svg>',
        "distractors": ["Мексика", "Ирландия", "Венгрия"]
    }
])
COUNTRIES.extend([
    {
        "countryId": "country-in",
        "wikidataId": "Q668",
        "nameRu": "Индия",
        "acceptedNames": ["Индия", "India", "Республика Индия"],
        "capitalRu": "Нью-Дели",
        "flagVisibleElements": "Три горизонтальные полосы шафранового, белого и зелёного цветов с синим колесом Ашока Чакра (24 спицы) в центре.",
        "descriptionSentences": [
            "Индия — крупное государство в Южной Азии, занимающее полуостров Индостан.",
            "Столицей страны является Нью-Дели.",
            "На севере страны возвышаются Гималаи, а по равнинам протекают священные реки Инд и Ганг.",
            "Флаг представляет собой триколор с синим колесом из двадцати четырех спиц в центре."
        ],
        "factIds": ["fact-in-loc", "fact-in-cap", "fact-in-geo", "fact-in-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="900" height="600"><rect width="900" height="200" fill="#ff9933"/><rect y="200" width="900" height="200" fill="#ffffff"/><rect y="400" width="900" height="200" fill="#138808"/><circle cx="450" cy="300" r="80" stroke="#000080" stroke-width="8" fill="none"/><circle cx="450" cy="300" r="15" fill="#000080"/></svg>',
        "distractors": ["Пакистан", "Бангладеш", "Непал"]
    },
    {
        "countryId": "country-eg",
        "wikidataId": "Q79",
        "nameRu": "Египет",
        "acceptedNames": ["Египет", "Egypt", "Арабская Республика Египет"],
        "capitalRu": "Каир",
        "flagVisibleElements": "Три горизонтальные полосы красного, белого и чёрного цветов с золотым орлом Саладина на белой полосе.",
        "descriptionSentences": [
            "Египет — трансконтинентальное государство на северо-востоке Африки и Синайском полуострове в Азии.",
            "Столицей страны является древний город Каир.",
            "Через всю территорию страны протекает река Нил, оазисы которой окружены пустынями Сахарой и Аравийской.",
            "Флаг состоит из красной, белой и черной полос с золотым орлом в центре."
        ],
        "factIds": ["fact-eg-loc", "fact-eg-cap", "fact-eg-geo", "fact-eg-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="900" height="600"><rect width="900" height="200" fill="#ce1126"/><rect y="200" width="900" height="200" fill="#ffffff"/><rect y="400" width="900" height="200" fill="#000000"/><polygon points="450,230 470,280 430,280" fill="#c09300"/><rect x="440" y="270" width="20" height="40" fill="#c09300"/></svg>',
        "distractors": ["Ирак", "Сирия", "Судан"]
    },
    {
        "countryId": "country-au",
        "wikidataId": "Q408",
        "nameRu": "Австралия",
        "acceptedNames": ["Австралия", "Australia", "Австралийский Союз"],
        "capitalRu": "Канберра",
        "flagVisibleElements": "Синее полотнище с флагом Великобритании в левом верхнем углу, большой семиконечной звездой под ним и созвездием Южного Креста справа.",
        "descriptionSentences": [
            "Австралия — государство, занимающее целый одноименный материк в Южном полушарии.",
            "Столицей государства является специально построенный город Канберра.",
            "Вдоль северо-восточного побережья тянется Большой Барьерный риф, крупнейший коралловый риф планеты.",
            "На синем полотнище флага изображен британский флаг в углу и белые звезды Южного Креста."
        ],
        "factIds": ["fact-au-loc", "fact-au-cap", "fact-au-geo", "fact-au-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" width="1000" height="500"><rect width="1000" height="500" fill="#00008b"/><rect width="400" height="250" fill="#00247d"/><polygon points="200,320 215,360 255,360 225,385 235,425 200,400 165,425 175,385 145,360 185,360" fill="#ffffff"/><circle cx="750" cy="150" r="15" fill="#ffffff"/><circle cx="850" cy="200" r="15" fill="#ffffff"/><circle cx="750" cy="350" r="15" fill="#ffffff"/><circle cx="650" cy="250" r="15" fill="#ffffff"/><circle cx="790" cy="280" r="10" fill="#ffffff"/></svg>',
        "distractors": ["Новая Зеландия", "Великобритания", "Фиджи"]
    }
])
COUNTRIES.extend([
    {
        "countryId": "country-gr",
        "wikidataId": "Q41",
        "nameRu": "Греция",
        "acceptedNames": ["Греция", "Greece", "Греческая Республика"],
        "capitalRu": "Афины",
        "flagVisibleElements": "Девять чередующихся синих и белых горизонтальных полос с белым равносторонним крестом в синем квадрате у древка.",
        "descriptionSentences": [
            "Греция — государство на юге Балканского полуострова в Южной Европе.",
            "Столицей страны и колыбелью античной демократии являются Афины.",
            "Около двадцати процентов площади страны приходится на многочисленные острова в Эгейском и Ионическом морях.",
            "Флаг состоит из девяти сине-белых полос и белого креста в левом верхнем углу."
        ],
        "factIds": ["fact-gr-loc", "fact-gr-cap", "fact-gr-geo", "fact-gr-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="900" height="600"><rect width="900" height="600" fill="#0d5eaf"/><rect y="66" width="900" height="66" fill="#ffffff"/><rect y="200" width="900" height="66" fill="#ffffff"/><rect y="333" width="900" height="66" fill="#ffffff"/><rect y="466" width="900" height="66" fill="#ffffff"/><rect width="300" height="300" fill="#0d5eaf"/><rect x="110" width="80" height="300" fill="#ffffff"/><rect y="110" width="300" height="80" fill="#ffffff"/></svg>',
        "distractors": ["Кипр", "Финляндия", "Израиль"]
    },
    {
        "countryId": "country-ar",
        "wikidataId": "Q414",
        "nameRu": "Аргентина",
        "acceptedNames": ["Аргентина", "Argentina", "Аргентинская Республика"],
        "capitalRu": "Буэнос-Айрес",
        "flagVisibleElements": "Три горизонтальные полосы: светло-синяя, белая и светло-синяя, с золотистым Майским солнцем в центре белой полосы.",
        "descriptionSentences": [
            "Аргентина — второе по площади государство Южной Америки, протянувшееся вдоль горной цепи Анд.",
            "Её столицей служит портовый город Буэнос-Айрес.",
            "На территории страны находится вершина Аконкагуа, высочайшая точка Западного полушария.",
            "На флаге между двумя голубыми полосами расположено изображение золотого солнца."
        ],
        "factIds": ["fact-ar-loc", "fact-ar-cap", "fact-ar-geo", "fact-ar-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500"><rect width="800" height="166" fill="#74acdf"/><rect y="166" width="800" height="168" fill="#ffffff"/><rect y="334" width="800" height="166" fill="#74acdf"/><circle cx="400" cy="250" r="45" fill="#f6b40e"/><circle cx="400" cy="250" r="55" stroke="#853406" stroke-width="3" fill="none"/></svg>',
        "distractors": ["Уругвай", "Парагвай", "Чили"]
    },
    {
        "countryId": "country-se",
        "wikidataId": "Q34",
        "nameRu": "Швеция",
        "acceptedNames": ["Швеция", "Sweden", "Королевство Швеция"],
        "capitalRu": "Стокгольм",
        "flagVisibleElements": "Синее прямоугольное полотнище со скандинавским жёлтым крестом, смещённым влево к древку.",
        "descriptionSentences": [
            "Швеция — скандинавское государство на севере Европы, омываемое Балтийским морем.",
            "Столицей государства является город Стокгольм, расположенный на четырнадцати островах.",
            "Большую часть территории покрывают хвойные таежные леса и тысячи пресноводных озер.",
            "Флаг страны синего цвета с характерным желтым скандинавским крестом."
        ],
        "factIds": ["fact-se-loc", "fact-se-cap", "fact-se-geo", "fact-se-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500"><rect width="800" height="500" fill="#006aa7"/><rect x="250" width="100" height="500" fill="#fecc00"/><rect y="200" width="800" height="100" fill="#fecc00"/></svg>',
        "distractors": ["Норвегия", "Финляндия", "Дания"]
    }
])
COUNTRIES.extend([
    {
        "countryId": "country-ch",
        "wikidataId": "Q39",
        "nameRu": "Швейцария",
        "acceptedNames": ["Швейцария", "Switzerland", "Швейцарская Конфедерация"],
        "capitalRu": "Берн",
        "flagVisibleElements": "Красное квадратное полотнище с белым прямым равносторонним крестом в центре.",
        "descriptionSentences": [
            "Швейцария — альпийское государство в Центральной Европе, не имеющее выхода к морю.",
            "Федеральным центром и фактической столицей Конфедерации является город Берн.",
            "Значительную часть страны занимают Альпы и Юрские горы с живописными ледниками.",
            "Государственный флаг имеет редкую квадратную форму с белым крестом на красном поле."
        ],
        "factIds": ["fact-ch-loc", "fact-ch-cap", "fact-ch-geo", "fact-ch-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500"><rect width="500" height="500" fill="#d52b1e"/><rect x="200" y="100" width="100" height="300" fill="#ffffff"/><rect x="100" y="200" width="300" height="100" fill="#ffffff"/></svg>',
        "distractors": ["Австрия", "Дания", "Чехия"]
    },
    {
        "countryId": "country-tr",
        "wikidataId": "Q43",
        "nameRu": "Турция",
        "acceptedNames": ["Турция", "Turkey", "Турецкая Республика"],
        "capitalRu": "Анкара",
        "flagVisibleElements": "Красное полотнище с белым полумесяцем и белой пятиконечной звездой в центре.",
        "descriptionSentences": [
            "Турция — государство, расположенное одновременно в Юго-Западной Азии и Юго-Восточной Европе.",
            "Официальной столицей государства является город Анкара.",
            "Проливы Босфор и Дарданеллы соединяют Черное море со Средиземным через Мраморное море.",
            "Флаг страны красного цвета с белым полумесяцем и пятиконечной звездой."
        ],
        "factIds": ["fact-tr-loc", "fact-tr-cap", "fact-tr-geo", "fact-tr-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="900" height="600"><rect width="900" height="600" fill="#e30a17"/><circle cx="360" cy="300" r="150" fill="#ffffff"/><circle cx="395" cy="300" r="120" fill="#e30a17"/><polygon points="480,300 520,312 555,290 535,325 560,355 520,345 495,375 500,335 465,315 505,310" fill="#ffffff"/></svg>',
        "distractors": ["Азербайджан", "Тунис", "Греция"]
    },
    {
        "countryId": "country-kr",
        "wikidataId": "Q884",
        "nameRu": "Республика Корея",
        "acceptedNames": ["Республика Корея", "Южная Корея", "South Korea"],
        "capitalRu": "Сеул",
        "flagVisibleElements": "Белое полотнище с красно-синим кругом тхэгык в центре и четырьмя чёрными триграммами по углам.",
        "descriptionSentences": [
            "Республика Корея — государство в Восточной Азии, расположенное на юге Корейского полуострова.",
            "Её столицей и крупнейшим городом является Сеул.",
            "Около семидесяти процентов площади страны занимают живописные горные хребты и возвышенности.",
            "На белом фоне флага изображен красно-синий символ гармонии и четыре черные триграммы."
        ],
        "factIds": ["fact-kr-loc", "fact-kr-cap", "fact-kr-geo", "fact-kr-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="900" height="600"><rect width="900" height="600" fill="#ffffff"/><path d="M 450,150 A 150,150 0 0,1 450,450 A 75,75 0 0,0 450,300 A 75,75 0 0,1 450,150 Z" fill="#cd2e3a"/><path d="M 450,150 A 75,75 0 0,1 450,300 A 75,75 0 0,0 450,450 A 150,150 0 0,1 450,150 Z" fill="#0047a0"/><rect x="200" y="150" width="70" height="15" transform="rotate(33 200 150)" fill="#000000"/><rect x="630" y="150" width="70" height="15" transform="rotate(-33 630 150)" fill="#000000"/></svg>',
        "distractors": ["Япония", "Китай", "Монголия"]
    }
])
COUNTRIES.extend([
    {
        "countryId": "country-mx",
        "wikidataId": "Q96",
        "nameRu": "Мексика",
        "acceptedNames": ["Мексика", "Mexico", "Мексиканские Соединённые Штаты"],
        "capitalRu": "Мехико",
        "flagVisibleElements": "Три вертикальные полосы: зелёная, белая и красная, с государственным гербом (орёл на кактусе со змеёй) в центре.",
        "descriptionSentences": [
            "Мексика — государство в южной части Северной Америки, омываемое Тихим океаном и Мексиканским заливом.",
            "Столицей страны является город Мехико, основанный на месте древнего Теночтитлана.",
            "На территории страны протянулись горные цепи Восточной и Западной Сьерра-Мадре с вулканом Орисаба.",
            "Флаг представляет собой зелено-бело-красный триколор с гербовым орлом на белой полосе."
        ],
        "factIds": ["fact-mx-loc", "fact-mx-cap", "fact-mx-geo", "fact-mx-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 560" width="980" height="560"><rect width="326" height="560" fill="#006847"/><rect x="326" width="328" height="560" fill="#ffffff"/><rect x="654" width="326" height="560" fill="#ce1126"/><circle cx="490" cy="280" r="50" fill="#8c6239"/><path d="M 470,250 Q 490,210 510,250 Z" fill="#4d3319"/></svg>',
        "distractors": ["Италия", "Гватемала", "Испания"]
    },
    {
        "countryId": "country-no",
        "wikidataId": "Q20",
        "nameRu": "Норвегия",
        "acceptedNames": ["Норвегия", "Norway", "Королевство Норвегия"],
        "capitalRu": "Осло",
        "flagVisibleElements": "Красное полотнище с тёмно-синим скандинавским крестом с белой каймой.",
        "descriptionSentences": [
            "Норвегия — северное европейское государство, занимающее западную часть Скандинавского полуострова.",
            "Столицей королевства является город Осло на берегу Осло-фьорда.",
            "Побережье страны изрезано тысячами глубоких живописных морских фьордов.",
            "Флаг имеет красное поле с синим скандинавским крестом в белой окантовке."
        ],
        "factIds": ["fact-no-loc", "fact-no-cap", "fact-no-geo", "fact-no-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 640" width="880" height="640"><rect width="880" height="640" fill="#ba0c2f"/><rect x="240" width="160" height="640" fill="#ffffff"/><rect y="240" width="880" height="160" fill="#ffffff"/><rect x="280" width="80" height="640" fill="#00205b"/><rect y="280" width="880" height="80" fill="#00205b"/></svg>',
        "distractors": ["Исландия", "Швеция", "Дания"]
    },
    {
        "countryId": "country-fi",
        "wikidataId": "Q33",
        "nameRu": "Финляндия",
        "acceptedNames": ["Финляндия", "Finland", "Финляндская Республика"],
        "capitalRu": "Хельсинки",
        "flagVisibleElements": "Белое прямоугольное полотнище с синим скандинавским крестом.",
        "descriptionSentences": [
            "Финляндия — государство в Северной Европе, омываемое Балтийским морем и его заливами.",
            "Столицей государства является приморский город Хельсинки.",
            "Страну часто называют краем тысячи озер, ведь на ее территории находится около ста восьмидесяти тысяч водоемов.",
            "Флаг представляет собой белый прямоугольник с синим скандинавским крестом."
        ],
        "factIds": ["fact-fi-loc", "fact-fi-cap", "fact-fi-geo", "fact-fi-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 550" width="900" height="550"><rect width="900" height="550" fill="#ffffff"/><rect x="250" width="150" height="550" fill="#002f6c"/><rect y="200" width="900" height="150" fill="#002f6c"/></svg>',
        "distractors": ["Швеция", "Греция", "Эстония"]
    }
])
COUNTRIES.extend([
    {
        "countryId": "country-es",
        "wikidataId": "Q29",
        "nameRu": "Испания",
        "acceptedNames": ["Испания", "Spain", "Королевство Испания"],
        "capitalRu": "Мадрид",
        "flagVisibleElements": "Три горизонтальные полосы: красная, жёлтая (двойной ширины) и красная, с государственным гербом у древка.",
        "descriptionSentences": [
            "Испания — государство на юго-западе Европы, занимающее большую часть Пиренейского полуострова.",
            "Столицей королевства является город Мадрид, расположенный в самом центре страны.",
            "Значительную часть территории занимает обширное плоскогорье Месета и горные цепи Пиренеев.",
            "Флаг состоит из красной, широкой желтой и красной полос с гербом со стороны древка."
        ],
        "factIds": ["fact-es-loc", "fact-es-cap", "fact-es-geo", "fact-es-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="900" height="600"><rect width="900" height="150" fill="#aa151b"/><rect y="150" width="900" height="300" fill="#f1bf00"/><rect y="450" width="900" height="150" fill="#aa151b"/><circle cx="300" cy="300" r="45" fill="#aa151b"/><rect x="280" y="270" width="40" height="60" fill="#ffffff"/></svg>',
        "distractors": ["Португалия", "Франция", "Андорра"]
    },
    {
        "countryId": "country-kz",
        "wikidataId": "Q232",
        "nameRu": "Казахстан",
        "acceptedNames": ["Казахстан", "Kazakhstan", "Республика Казахстан"],
        "capitalRu": "Астана",
        "flagVisibleElements": "Лазурно-голубое полотнище с золотым солнцем с 32 лучами, парящим степным беркутом в центре и национальным орнаментом у древка.",
        "descriptionSentences": [
            "Казахстан — крупнейшее государство Центральной Азии, не имеющее выхода к Мировому океану.",
            "Столицей республики является город Астана на реке Ишим.",
            "Большую часть территории занимают бескрайние степи, полупустыни и горные цепи Тянь-Шаня.",
            "На лазурно-голубом полотнище флага сияет золотое солнце с парящим степным орлом."
        ],
        "factIds": ["fact-kz-loc", "fact-kz-cap", "fact-kz-geo", "fact-kz-flag"],
        "svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" width="1000" height="500"><rect width="1000" height="500" fill="#00afca"/><circle cx="500" cy="220" r="60" fill="#ffe100"/><path d="M 400,280 Q 500,320 600,280 Q 500,295 400,280 Z" fill="#ffe100"/><rect x="20" width="60" height="500" fill="#ffe100"/></svg>',
        "distractors": ["Узбекистан", "Кыргызстан", "Монголия"]
    }
])

def verify_teacher_descriptions():
    for c in COUNTRIES:
        sentences = c["descriptionSentences"]
        assert len(sentences) in (3, 4), f"{c['countryId']}: expected 3-4 sentences in list, got {len(sentences)}"
        all_text = " ".join(sentences)
        words = all_text.split()
        assert len(words) <= 80, f"{c['countryId']}: word count {len(words)} exceeds 80 words limit"
        for idx, s in enumerate(sentences):
            assert s.endswith("."), f"{c['countryId']} sentence {idx} does not end with period: {s}"
            inner = s[:-1]
            assert "." not in inner and "!" not in inner and "?" not in inner, f"{c['countryId']} sentence {idx} contains internal sentence break: {s}"
    return True
