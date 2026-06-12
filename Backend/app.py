from __future__ import annotations
import json
import os
from datetime import datetime
from uuid import uuid4
from typing import List, Dict, Any, Optional

from flask import Flask, jsonify, request, make_response, url_for
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "evaluations.json")

app = Flask(__name__)
CORS(app)


def load_data() -> List[Dict[str, Any]]:
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except Exception:
            return []


def save_data(data: List[Dict[str, Any]]) -> None:
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def find_item(data: List[Dict[str, Any]], item_id: str) -> Optional[Dict[str, Any]]:
    for item in data:
        if item.get("id") == item_id:
            return item
    return None


@app.route("/evaluations", methods=["GET"])
def list_evaluations():
    data = load_data()
    return jsonify(data)


@app.route("/evaluations/<item_id>", methods=["GET"])
def get_evaluation(item_id: str):
    data = load_data()
    item = find_item(data, item_id)
    if not item:
        return make_response(jsonify({"error": "Not found"}), 404)
    return jsonify(item)


@app.route("/evaluations", methods=["POST"])
def create_evaluation():
    if not request.is_json:
        return make_response(jsonify({"error": "Request body must be JSON"}), 400)
    payload = request.get_json()
    # Basic validation: require a title or name field
    if not payload or (not payload.get("title") and not payload.get("name")):
        return make_response(jsonify({"error": "Missing required field: title or name"}), 400)

    data = load_data()
    new_item = {
        "id": str(uuid4()),
        "title": payload.get("title") or payload.get("name"),
        "data": payload.get("data", {}),
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    # merge additional fields if provided
    for k, v in payload.items():
        if k not in new_item:
            new_item[k] = v

    data.append(new_item)
    save_data(data)
    resp = make_response(jsonify(new_item), 201)
    resp.headers["Location"] = url_for("get_evaluation", item_id=new_item["id"]) 
    return resp


@app.route("/evaluations/<item_id>", methods=["PUT"])
def update_evaluation(item_id: str):
    if not request.is_json:
        return make_response(jsonify({"error": "Request body must be JSON"}), 400)
    payload = request.get_json()
    data = load_data()
    item = find_item(data, item_id)
    if not item:
        return make_response(jsonify({"error": "Not found"}), 404)

    # Update allowed fields
    for k, v in payload.items():
        if k == "id":
            continue
        item[k] = v

    save_data(data)
    return jsonify(item)


@app.route("/evaluations/<item_id>", methods=["DELETE"])
def delete_evaluation(item_id: str):
    data = load_data()
    item = find_item(data, item_id)
    if not item:
        return make_response(jsonify({"error": "Not found"}), 404)
    data = [i for i in data if i.get("id") != item_id]
    save_data(data)
    return make_response("", 204)


if __name__ == "__main__":
    # Create data file if missing
    if not os.path.exists(DATA_FILE):
        save_data([])
    app.run(host="0.0.0.0", port=5000, debug=True)
