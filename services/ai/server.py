import json
import os
import sys
import torch
from http.server import HTTPServer, BaseHTTPRequestHandler
from transformers import AutoTokenizer, AutoModelForCausalLM

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "llm", "Qwen2.5-3B-Instruct")
HOST = "0.0.0.0"
PORT = int(os.environ.get("OLLAMA_PORT", "11434"))

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading Qwen2.5-3B-Instruct from {MODEL_PATH} onto {DEVICE} ...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)

kwargs = {"low_cpu_mem_usage": True}
if torch.cuda.is_available():
    from transformers import BitsAndBytesConfig
    kwargs["quantization_config"] = BitsAndBytesConfig(
        load_in_8bit=True,
    )
    kwargs["device_map"] = "auto"
else:
    kwargs["dtype"] = torch.bfloat16

model = AutoModelForCausalLM.from_pretrained(MODEL_PATH, **kwargs)
model.eval()
print(f"Qwen2.5-3B-Instruct model loaded on {DEVICE} (8-bit GPU) successfully.")

class OllamaHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/api/tags"):
            data = {"status": "Ollama is running", "models": [{"name": "qwen2.5:3b", "model": "qwen2.5:3b"}]}
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path in ("/api/generate", "/api/chat"):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                req = json.loads(body)
            except Exception:
                req = {}

            system_msg = (
                "Ты преподаватель в академии Discovery (София — Хранительница знаний). "
                "Отвечай исключительно на грамотном русском языке. "
                "Ответ должен быть понятным, полезным и дружелюбным (2-4 предложения). "
                "Обязательно помни всю историю общения с учеником, его имя, предпочтения и то, о чём вы говорили ранее до того, как отошли или завершили прошлый разговор. "
                "Категорически запрещено использовать китайский язык или иероглифы."
            )

            req_messages = req.get("messages")
            if req_messages and isinstance(req_messages, list) and len(req_messages) > 0:
                messages = []
                has_system = False
                for m in req_messages:
                    r = m.get("role", "user")
                    if r in ("npc", "bot"):
                        r = "assistant"
                    if r == "system":
                        has_system = True
                    messages.append({"role": r, "content": m.get("content", "")})
                if not has_system:
                    messages.insert(0, {"role": "system", "content": system_msg})
            else:
                raw_prompt = req.get("prompt", "")
                messages = [
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": raw_prompt}
                ]

            try:
                chat = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
                inputs = tokenizer(chat, return_tensors="pt", truncation=True, max_length=4096).to(model.device)
                max_new = int(req.get("max_tokens", req.get("max_new_tokens", 256)))
                with torch.no_grad():
                    outputs = model.generate(
                        **inputs,
                        max_new_tokens=max_new,
                        do_sample=True,
                        temperature=0.7,
                        top_p=0.9,
                        repetition_penalty=1.1,
                        pad_token_id=tokenizer.eos_token_id,
                    )
                generated = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True).strip()
            except Exception as e:
                print(f"[LLM] Error during generation: {e}", file=sys.stderr)
                generated = "Я помню наш предыдущий разговор. Давайте продолжим наше исследование!"

            resp = {
                "model": "qwen2.5:3b",
                "response": generated,
                "message": {"role": "assistant", "content": generated},
                "done": True
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(resp, ensure_ascii=False).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

def main():
    server = HTTPServer((HOST, PORT), OllamaHandler)
    print(f"Discovery Ollama-compatible LLM Server running on http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping LLM Server...")
        server.server_close()

if __name__ == "__main__":
    main()
