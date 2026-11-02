import json

with open('discovery-protocol-2.0.0/schemas/v2.0.0/education.schema.json', 'r', encoding='utf-8') as f:
    s = json.load(f)
for k, v in s.get('$defs', {}).items():
    print(k, ':', v.get('required', []))
    if k in ['attempt', 'quizSummary']:
        print(json.dumps(v, indent=2)[:600])
