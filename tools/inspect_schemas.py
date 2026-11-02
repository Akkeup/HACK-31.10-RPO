import json

def inspect():
    with open('discovery-protocol-2.0.0/schemas/v2.0.0/server-message.schema.json', 'r', encoding='utf-8') as f:
        s = json.load(f)
    print("competition.answer.accepted payload:")
    print(json.dumps(s.get('$defs', {}).get('competition.answer.accepted', {}), indent=2))

    with open('discovery-protocol-2.0.0/schemas/v2.0.0/client-message.schema.json', 'r', encoding='utf-8') as f:
        s2 = json.load(f)
    print("competition.answer payload:")
    print(json.dumps(s2.get('$defs', {}).get('competition.answer', {}), indent=2))

    print("\nquiz.answer:")
    print(json.dumps(s2.get('$defs', {}).get('quiz.answer', {}), indent=2))

    print("\nquiz.state:")
    print(json.dumps(s.get('$defs', {}).get('quiz.state', {}), indent=2))

    print("\nlibrary.open:")
    print(json.dumps(s2.get('$defs', {}).get('library.open', {}), indent=2))

    print("\ncountry.describe:")
    print(json.dumps(s2.get('$defs', {}).get('country.describe', {}), indent=2))

if __name__ == '__main__':
    inspect()
