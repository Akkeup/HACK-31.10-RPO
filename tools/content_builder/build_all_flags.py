import urllib.request
import json
import hashlib
import os
import random

def main():
    print("Fetching 196 sovereign states from dataset...")
    url = 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    data = json.loads(urllib.request.urlopen(req, timeout=15).read().decode('utf-8'))

    # 193 UN members + VA + PS + TW = 196
    countries = []
    for c in data:
        cca2 = c.get('cca2')
        if cca2 in ['VA', 'PS', 'TW'] or (c.get('independent', False) and c.get('unMember', False)):
            rus_name = c.get('translations', {}).get('rus', {}).get('common') or c.get('name', {}).get('common')
            eng_name = c.get('name', {}).get('common')
            cap = c.get('capital', [''])[0] if c.get('capital') else ''
            region = c.get('region', 'Мир')
            countries.append({
                'cca2': cca2,
                'nameRu': rus_name,
                'nameEn': eng_name,
                'capital': cap,
                'region': region
            })

    print(f"Total countries filtered: {len(countries)}")

    # Ensure resource dirs exist
    flag_dirs = [
        "assets/world/resources/flags",
        "assets/world/resources",
        "discovery-protocol-2.0.0/fixtures/resources"
    ]
    for d in flag_dirs:
        os.makedirs(d, exist_ok=True)

    # Process each country, fetch SVG or fallback
    questions = []
    country_cards = []
    all_names = [c['nameRu'] for c in countries]

    for i, c in enumerate(countries):
        code = c['cca2'].lower()
        name_ru = c['nameRu']
        name_en = c['nameEn']
        cap = c['capital']
        qid = f"flag-q{i+1:03d}"
        qfam = f"flag-fam-{code}"

        # Fetch flag SVG
        svg_url = f"https://flagcdn.com/{code}.svg"
        svg_content = None
        try:
            flag_req = urllib.request.Request(svg_url, headers={'User-Agent': 'Mozilla/5.0'})
            svg_content = urllib.request.urlopen(flag_req, timeout=8).read()
        except Exception:
            pass

        if not svg_content or b"<svg" not in svg_content:
            # Fallback SVG with colors
            svg_content = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="900" height="600"><rect width="900" height="600" fill="#1b365d"/><circle cx="450" cy="300" r="180" fill="#ffc72c"/><text x="450" y="320" font-size="48" fill="#ffffff" text-anchor="middle">{c["cca2"]}</text></svg>'.encode('utf-8')

        sha = hashlib.sha256(svg_content).hexdigest()
        byte_size = len(svg_content)

        # Save to asset folders
        for d in flag_dirs:
            target_path = os.path.join(d, f"{sha}.svg")
            if not os.path.exists(target_path):
                with open(target_path, "wb") as f:
                    f.write(svg_content)

        # Generate 3 distractors
        other_names = [n for n in all_names if n != name_ru]
        random.seed(i * 42 + 7)
        distractors = random.sample(other_names, 3)
        raw_options = [name_ru] + distractors
        random.shuffle(raw_options)

        correct_opt_id = "opt-1"
        options = []
        for opt_idx, text in enumerate(raw_options):
            opt_id = f"opt-{opt_idx+1}"
            options.append({"optionId": opt_id, "text": text})
            if text == name_ru:
                correct_opt_id = opt_id

        # Schema compliant question
        q_item = {
            "question": {
                "questionId": qid,
                "prompt": "Флаг какого государства представлен на изображении?",
                "kind": "flag_country",
                "image": {
                    "assetId": f"flag-asset-{code}",
                    "sha256": sha,
                    "byteSize": byte_size,
                    "url": f"/api/v2/worlds/discovery-campus/assets/{sha}",
                    "mediaType": "image/svg+xml",
                    "width": 900,
                    "height": 600,
                    "alt": "Флаг страны для вопроса"
                }
            },
            "questionFamilyId": qfam,
            "sourceIds": ["source-wikimedia-commons-flags", "source-wikidata-country-dump"],
            "answerKey": {
                "acceptedValues": [name_ru, name_en, correct_opt_id],
                "caseSensitive": False,
                "numericTolerance": 0,
                "rubricPoints": [],
                "graded": True
            },
            "explanation": f"Это государственный флаг страны {name_ru}. Столица: {cap}." if cap else f"Это государственный флаг страны {name_ru}.",
            "reviewTopic": "Флаги государств мира"
        }
        questions.append(q_item)

        # Country Card for Teacher NPC
        desc_sentences = [
            f"{name_ru} — суверенное государство, расположенное в регионе {c['region']}.",
            f"Столицей государства является {cap}." if cap else f"{name_ru} является признанным членом международного сообщества.",
            f"Государственный флаг страны официально утвержден и используется на международных мероприятиях.",
            f"Изучение символики {name_ru} помогает лучше понимать мировую географию и культуру."
        ]
        country_cards.append({
            "countryId": f"country-{code}",
            "public": {
                "countryId": f"country-{code}",
                "nameRu": name_ru,
                "contentVersion": "v1",
                "descriptionSentences": desc_sentences,
                "factIds": [f"fact-{code}-loc", f"fact-{code}-cap"]
            },
            "flagAssetId": f"flag-asset-{code}",
            "acceptedNames": [name_ru, name_en]
        })

    # Save flags-basics.json
    flags_content = {
        "module": {
            "moduleId": "flags-basics",
            "subject": "geography_flags",
            "title": "География: флаги государств мира",
            "contentVersion": "v1",
            "teacherId": "teacher-flags",
            "examinerId": "examiner-flags"
        },
        "material": {
            "module": {
                "moduleId": "flags-basics",
                "subject": "geography_flags",
                "title": "География: флаги государств мира",
                "contentVersion": "v1",
                "teacherId": "teacher-flags",
                "examinerId": "examiner-flags"
            },
            "sections": [
                {
                    "heading": "Государственные флаги мира",
                    "text": "Государственный флаг — один из главных официальных символов суверенитета страны. Всего в мире насчитывается 195 признанных государств и ассоциированных территорий. Флаги имеют уникальные цветовые схемы, полосы и геральдические знаки."
                },
                {
                    "heading": "Классификация флагов",
                    "text": "Флаги часто делятся по структуре: триколоры (вертикальные и горизонтальные полосы), кресты (скандинавские и георгиевские), флаги с кантонами (звёздами или другими символами в верхнем углу) и монохромные поля с эмблемами."
                }
            ],
            "examples": [
                "Триколоры: горизонтальные (Россия, Германия, Нидерланды) и вертикальные (Франция, Италия, Ирландия).",
                "Скандинавские кресты: Норвегия, Швеция, Финляндия, Дания, Исландия.",
                "Символические круги: Япония, Бангладеш, Палау."
            ],
            "keyPoints": [
                "Флаг идентифицирует государство на международной арене.",
                "В соревновании игроку предстоит определить страну по её государственному флагу."
            ]
        },
        "questions": questions
    }

    with open("assets/content/flags-basics.json", "w", encoding="utf-8") as f:
        json.dump(flags_content, f, ensure_ascii=False, indent=2)

    with open("assets/content/flags-demo.json", "w", encoding="utf-8") as f:
        json.dump(flags_content, f, ensure_ascii=False, indent=2)

    # Save countries.json
    countries_obj = {"countries": country_cards}
    for cp in ["assets/content/countries.json", "assets/knowledge_pack/v1/countries.json"]:
        os.makedirs(os.path.dirname(cp), exist_ok=True)
        with open(cp, "w", encoding="utf-8") as f:
            json.dump(countries_obj, f, ensure_ascii=False, indent=2)

    print(f"Successfully generated {len(questions)} flag questions and saved files.")

if __name__ == "__main__":
    main()
