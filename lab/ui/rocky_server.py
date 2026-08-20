"""
Rocky Web Bridge — play_fen bridge (avec historique complet).
Usage :
  cd C:\TACTICAL_CHESS_STUDIO
  .venv312\Scripts\python.exe lab/ui/rocky_server.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess, os, json

app = Flask(__name__)
CORS(app)

REPO_PATH = os.environ.get("TCS_PATH", r"C:\TACTICAL_CHESS_STUDIO")
ROCKY_EXE = os.path.join(REPO_PATH, "target", "release", "tactical_chess_pure_lab.exe")
EXE_EXISTS = os.path.exists(ROCKY_EXE)

def run_play_fen(fen: str, moves: str = "") -> dict:
    if EXE_EXISTS:
        cmd = [ROCKY_EXE, "play_fen", fen, moves]
    else:
        cmd = ["cargo", "run", "--release", "--", "play_fen", fen, moves]

    r = subprocess.run(cmd, capture_output=True, text=True, cwd=REPO_PATH, timeout=15)
    output = r.stdout + r.stderr

    for line in output.splitlines():
        line = line.strip()
        if not line or not line.startswith("{"):
            continue
        try:
            data = json.loads(line)
            if "move" in data or "error" in data:
                return data
        except json.JSONDecodeError:
            pass
    return {"error": "Pas de JSON valide", "raw": output[:800]}

@app.route("/status")
def status():
    return jsonify({"ready": True, "exe": EXE_EXISTS, "mode": "play_fen"})

@app.route("/move", methods=["POST"])
def get_move():
    data = request.json or {}
    fen = data.get("fen", "")
    moves = data.get("moves", "")
    if not fen:
        return jsonify({"error": "FEN manquant"}), 400
    try:
        result = run_play_fen(fen, moves)
        if result.get("move"):
            return jsonify(result)
        return jsonify({"error": result.get("error", "Coup non trouve"), "raw": result.get("raw", "")}), 500
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timeout"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print(f"Exe    : {'oui' if EXE_EXISTS else 'cargo run'}")
    print("Mode   : play_fen (historique complet)")
    print("Serveur: http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)
