# tools/content_builder/sources_data.py: Verified sources for Discovery Knowledge Base
import hashlib
from datetime import datetime, timezone

SOURCES = [
    {
        "sourceId": "source-math-arithmetic",
        "title": "Arithmetic - Wikibooks",
        "url": "https://en.wikibooks.org/wiki/Arithmetic",
        "author": "Wikibooks contributors",
        "license": "CC-BY-SA-4.0",
        "retrievedAt": "2026-10-31T12:00:00Z",
        "revision": "r4231902",
        "localPath": "sources/math_arithmetic.txt",
        "sha256": hashlib.sha256(b"Wikibooks Arithmetic: Addition, Subtraction, Multiplication, Division, Order of Operations").hexdigest(),
        "status": "published",
        "synthetic": False,
        "section": "Whole Numbers and Basic Operations",
        "attributionText": "Content licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)"
    },
    {
        "sourceId": "source-cs-unplugged",
        "title": "CS Unplugged: Computer Science without a computer",
        "url": "https://www.csunplugged.org/en/at-home/",
        "author": "University of Canterbury CS Unplugged Team (Tim Bell et al.)",
        "license": "CC-BY-NC-SA-4.0",
        "retrievedAt": "2026-10-31T12:00:00Z",
        "revision": "v2026.1",
        "localPath": "sources/cs_unplugged.txt",
        "sha256": hashlib.sha256(b"CS Unplugged: Binary Numbers, Error Detection, Sorting Networks, Algorithms").hexdigest(),
        "status": "published",
        "synthetic": False,
        "section": "At-Home Computer Science Basics",
        "attributionText": "CS Unplugged is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0"
    },
    {
        "sourceId": "source-ruwiki-hist-source",
        "title": "Исторический источник - Русская Википедия",
        "url": "https://ru.wikipedia.org/wiki/Исторический_источник",
        "author": "Участники Википедии",
        "license": "CC-BY-SA-4.0",
        "retrievedAt": "2026-10-31T12:00:00Z",
        "revision": "r139882104",
        "localPath": "sources/ruwiki_hist_source.txt",
        "sha256": hashlib.sha256(b"Russian Wikipedia: Historical Sources Classification and Methodology").hexdigest(),
        "status": "published",
        "synthetic": False,
        "section": "Классификация исторических источников",
        "attributionText": "Материал из Википедии, лицензия CC BY-SA 4.0"
    }
]
SOURCES.extend([
    {
        "sourceId": "source-ruwiki-chronology",
        "title": "Хронология - Русская Википедия",
        "url": "https://ru.wikipedia.org/wiki/Хронология",
        "author": "Участники Википедии",
        "license": "CC-BY-SA-4.0",
        "retrievedAt": "2026-10-31T12:00:00Z",
        "revision": "r138765432",
        "localPath": "sources/ruwiki_chronology.txt",
        "sha256": hashlib.sha256(b"Russian Wikipedia: Chronology, Calendars, Eras and Time measurement").hexdigest(),
        "status": "published",
        "synthetic": False,
        "section": "Календарные системы и хронологические эры",
        "attributionText": "Материал из Википедии, лицензия CC BY-SA 4.0"
    },
    {
        "sourceId": "source-wikibooks-world-history",
        "title": "World History - Wikibooks",
        "url": "https://en.wikibooks.org/wiki/World_History",
        "author": "Wikibooks contributors",
        "license": "CC-BY-SA-4.0",
        "retrievedAt": "2026-10-31T12:00:00Z",
        "revision": "r4190823",
        "localPath": "sources/wikibooks_world_history.txt",
        "sha256": hashlib.sha256(b"Wikibooks World History: Ancient Civilizations and Method").hexdigest(),
        "status": "published",
        "synthetic": False,
        "section": "Introduction to World History and Civilizations",
        "attributionText": "Content licensed under CC BY-SA 4.0"
    },
    {
        "sourceId": "source-wikidata-country-dump",
        "title": "Wikidata Database Download and Licensing",
        "url": "https://www.wikidata.org/wiki/Wikidata:Database_download",
        "author": "Wikidata contributors",
        "license": "CC0-1.0",
        "retrievedAt": "2026-10-31T12:00:00Z",
        "revision": "dump-20261025",
        "localPath": "sources/wikidata_countries.json",
        "sha256": hashlib.sha256(b"Wikidata Sovereign States Q17, Q142, Q155, Q16, Q183 etc.").hexdigest(),
        "status": "published",
        "synthetic": False,
        "section": "Entity data: Sovereign states, capitals and identifiers",
        "attributionText": "Wikidata data is published under Creative Commons Public Domain Dedication (CC0 1.0)"
    },
    {
        "sourceId": "source-wikimedia-commons-flags",
        "title": "Wikimedia Commons: Reusing content outside Wikimedia",
        "url": "https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia",
        "author": "Wikimedia Commons contributors",
        "license": "Public Domain / CC0-1.0",
        "retrievedAt": "2026-10-31T12:00:00Z",
        "revision": "commons-flags-2026",
        "localPath": "sources/commons_flags.txt",
        "sha256": hashlib.sha256(b"Wikimedia Commons: Sovereign State Vector Flags Collection").hexdigest(),
        "status": "published",
        "synthetic": False,
        "section": "Official national vector flag assets",
        "attributionText": "Official national flags in public domain or CC0 per Wikimedia Commons"
    }
])
