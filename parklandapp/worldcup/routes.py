"""World Cup bracket pool routes.

Serves the interactive bracket pages and handles entry submissions.
Data lives in a JSON file alongside this module.
"""

import json
import os
import threading
from datetime import datetime

from flask import jsonify, render_template, request, send_from_directory

from . import worldcup

# Static assets directory for worldcup
STATIC_WC = os.path.join(
    os.path.dirname(__file__), "..", "static", "worldcup"
)

# Entries file — stored in this blueprint's directory
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
ENTRIES_FILE = os.path.join(DATA_DIR, "entries.json")

# Simple lock for concurrent writes
_write_lock = threading.Lock()

# Max entries to prevent abuse
MAX_ENTRIES = 200


def _ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(ENTRIES_FILE):
        with open(ENTRIES_FILE, "w") as f:
            json.dump({"entries": []}, f)


def _read_entries():
    _ensure_data_dir()
    with open(ENTRIES_FILE) as f:
        return json.load(f)


def _write_entries(data):
    _ensure_data_dir()
    with open(ENTRIES_FILE, "w") as f:
        json.dump(data, f, indent=2)


# --- Page routes ---

@worldcup.route("/worldcup")
def index():
    return render_template("worldcup/index.html")


@worldcup.route("/worldcup/entry")
def entry():
    return render_template("worldcup/entry.html")


@worldcup.route("/worldcup/admin")
def admin():
    return render_template("worldcup/admin.html")


@worldcup.route("/worldcup/analysis")
def analysis():
    return render_template("worldcup/analysis.html")


# --- Static asset proxy (keeps HTML source paths working as-is) ---

@worldcup.route("/worldcup/css/<path:filename>")
def serve_css(filename):
    return send_from_directory(os.path.join(STATIC_WC, "css"), filename)


@worldcup.route("/worldcup/js/<path:filename>")
def serve_js(filename):
    return send_from_directory(os.path.join(STATIC_WC, "js"), filename)


@worldcup.route("/worldcup/data/<path:filename>")
def serve_data(filename):
    return send_from_directory(os.path.join(STATIC_WC, "data"), filename)


# --- API routes ---

@worldcup.route("/worldcup/api/submit", methods=["POST"])
def submit_entry():
    """Accept a bracket entry submission."""
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Invalid JSON"}), 400

    # Validate required fields
    required = ["id", "name", "nickname", "picks", "champion"]
    missing = [f for f in required if f not in body]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # Build the entry record
    entry = {
        "id": str(body["id"]).strip(),
        "name": str(body["name"]).strip(),
        "nickname": str(body["nickname"]).strip(),
        "paid": False,
        "submitted": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "picks": body["picks"],
        "champion": str(body["champion"]).strip(),
    }

    if not entry["id"] or not entry["name"] or not entry["nickname"]:
        return jsonify({"error": "Name, nickname, and ID are required"}), 400

    with _write_lock:
        data = _read_entries()

        if len(data["entries"]) >= MAX_ENTRIES:
            return jsonify({"error": "Entry limit reached"}), 403

        # Check for duplicate ID — update if exists, otherwise append
        existing_idx = None
        for i, e in enumerate(data["entries"]):
            if e["id"] == entry["id"]:
                existing_idx = i
                break

        if existing_idx is not None:
            data["entries"][existing_idx] = entry
            action = "updated"
        else:
            data["entries"].append(entry)
            action = "created"

        _write_entries(data)

    return jsonify({
        "status": "ok",
        "action": action,
        "id": entry["id"],
        "count": len(data["entries"]),
    })


@worldcup.route("/worldcup/api/entries", methods=["GET"])
def get_entries():
    """Return entry count and public nicknames (no private data)."""
    data = _read_entries()
    public = [
        {"nickname": e["nickname"], "id": e["id"], "paid": e.get("paid", False)}
        for e in data["entries"]
    ]
    return jsonify({"count": len(public), "entries": public})
