import urllib.request
import json
import sys
from datetime import datetime

def call_lm_studio(prompt: str, model: str) -> str:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 180,
        "temperature": 0.65,
        "stream": False,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        LM_STUDIO_CHAT,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=LM_STUDIO_TIMEOUT) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"].strip()
    except urllib.error.HTTPError as e:
        return "[HTTP " + str(e.code) + "]"
    except urllib.error.URLError as e:
        return "[URLError : " + str(e.reason) + "]"
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        return "[reponse invalide : " + str(e) + "]"

def main():
    LM_STUDIO_CHAT = "http://127.0.0.1:1234/v1/chat/completions"
    LM_STUDIO_TIMEOUT = 60
    model = "gpt-3.5-turbo"  # or any other model you want to use

    for line in sys.stdin:
        move_data = line.strip().split("|")
        if len(move_data) < 2 or move_data[0] != "search":
            continue

        source, phase, band, plan, selected = move_data[:5]
        prompt = f"Explain the chess move: {source}, {phase}, {band}, {plan}, {selected}"
        explanation = call_lm_studio(prompt, model)

        trace = {
            "move": line.strip(),
            "explanation": explanation,
            "timestamp": datetime.now().isoformat()
        }

        trace_file_path = f"lab/traces/{datetime.now().strftime('%Y%m%d_%H%M%S')}_{source}.json"
        with open(trace_file_path, 'w') as trace_file:
            json.dump(trace, trace_file, indent=2)

if __name__ == "__main__":
    main()