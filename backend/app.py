from flask import Flask, jsonify
from flask_cors import CORS
from green_anchor_processor import generate_green_anchors
from corridor_logic import find_candidate_corridors
from storage_utils import load_corridors, save_corridors


app = Flask(__name__)
CORS(app)

@app.route("/")
def index():
    return jsonify({"status": "Backend is running"})

@app.route("/generate")
def generate():
    gdf = generate_green_anchors()
    print("ANCHORS FOUND:", len(gdf))

    corridors = find_candidate_corridors(gdf)
    print("CORRIDORS FOUND:", len(corridors))

    save_corridors(corridors)
    return jsonify({"status": "generated", "count": len(corridors)})

@app.route("/corridors")
def get_corridors():
    return jsonify(load_corridors())

@app.route("/upvote/<cid>", methods=["POST"])
def upvote(cid):
    corridors = load_corridors()
    for c in corridors:
        if c["id"] == cid:
            c["upvotes"] += 1
            break
    save_corridors(corridors)
    return jsonify({"status": "upvoted"})

if __name__ == "__main__":
    app.run(debug=True, port=5001)