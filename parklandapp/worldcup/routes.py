"""World Cup bracket pool routes.

Serves the interactive bracket pages and handles entry submissions.
Data stored in Google Cloud Datastore.
"""

import os
from datetime import datetime

from flask import jsonify, render_template, request, send_from_directory
from google.cloud import datastore

from . import worldcup

# Datastore client (uses default project credentials on GAE)
ds = datastore.Client()

# Static assets directory for worldcup
STATIC_WC = os.path.join(
    os.path.dirname(__file__), "..", "static", "worldcup"
)

MAX_ENTRIES = 200


# --- Datastore helpers ---

def _get_entry(entry_id):
    """Fetch a single entry by ID."""
    key = ds.key("BracketEntry", entry_id)
    return ds.get(key)


def _put_entry(entry_dict):
    """Write an entry to Datastore. Uses entry['id'] as the key."""
    key = ds.key("BracketEntry", entry_dict["id"])
    entity = datastore.Entity(key=key, exclude_from_indexes=("picks", "group_rankings", "third_place_qualifiers"))
    entity.update(entry_dict)
    ds.put(entity)


def _count_entries():
    """Count total bracket entries."""
    query = ds.query(kind="BracketEntry")
    query.keys_only()
    return len(list(query.fetch()))


def _all_entries():
    """Fetch all bracket entries."""
    query = ds.query(kind="BracketEntry")
    return list(query.fetch())


def _log_event(event_type, data=None):
    """Log an event to the EventLog kind for analytics."""
    key = ds.key("EventLog")
    entity = datastore.Entity(key=key, exclude_from_indexes=("data",))
    entity.update({
        "type": event_type,
        "timestamp": datetime.utcnow(),
        "data": data or {},
    })
    ds.put(entity)


# --- Page routes ---

@worldcup.route("/worldcup")
def index():
    return render_template("worldcup/index.html")


@worldcup.route("/worldcup/entry")
def entry():
    return render_template("worldcup/quick-entry.html")


@worldcup.route("/worldcup/group")
def group_entry():
    return render_template("worldcup/alt-entry.html")


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

SCORING = {
    "points_per_round": {"R32": 1, "R16": 2, "QF": 4, "SF": 8, "Final": 16},
    "champion_bonus": 10,
    "payout": {"1st": "60%", "2nd": "25%", "3rd": "15%"},
}
ROUNDS = ["R32", "R16", "QF", "SF", "Final"]


@worldcup.route("/worldcup/api/standings", methods=["GET"])
def api_standings():
    """Generate standings from Datastore entries. Pre-tournament: all scores 0."""
    entries = _all_entries()

    standings = []
    for e in entries:
        entry_type = "group-stage" if e.get("group_rankings") else "32-team"
        standings.append({
            "name": e.get("nickname", e.get("name", "")),
            "nickname": e.get("nickname", e.get("name", "")),
            "entry_type": entry_type,
            "total": 0,
            "champion_bonus": 0,
            "champion_pick": e.get("champion", ""),
            "breakdown": {r: {"correct": 0, "possible": 0, "points": 0} for r in ROUNDS},
            "rank": 1,
        })

    # Sort by total (all 0 for now), then alphabetically
    standings.sort(key=lambda s: (-s["total"], s["nickname"].lower()))
    for i, s in enumerate(standings):
        if i > 0 and s["total"] == standings[i - 1]["total"]:
            s["rank"] = standings[i - 1]["rank"]
        else:
            s["rank"] = i + 1

    return jsonify({
        "last_updated": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
        "results_through": "",
        "scoring": SCORING,
        "standings": standings,
    })

@worldcup.route("/worldcup/api/submit", methods=["POST"])
def submit_entry():
    """Accept a bracket entry submission."""
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Invalid JSON"}), 400

    required = ["id", "name", "nickname", "picks", "champion"]
    missing = [f for f in required if f not in body]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    entry = {
        "id": str(body["id"]).strip(),
        "name": str(body["name"]).strip(),
        "nickname": str(body["nickname"]).strip(),
        "paid": False,
        "submitted": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
        "picks": body["picks"],
        "champion": str(body["champion"]).strip(),
    }

    # Group stage bracket entries include extra fields
    if "group_rankings" in body:
        entry["group_rankings"] = body["group_rankings"]
    if "third_place_qualifiers" in body:
        entry["third_place_qualifiers"] = body["third_place_qualifiers"]

    if not entry["id"] or not entry["name"] or not entry["nickname"]:
        return jsonify({"error": "Name, nickname, and ID are required"}), 400

    # Check entry limit
    existing = _get_entry(entry["id"])
    if not existing and _count_entries() >= MAX_ENTRIES:
        return jsonify({"error": "Entry limit reached"}), 403

    action = "updated" if existing else "created"
    _put_entry(entry)

    # Log the submission event
    _log_event("entry_submit", {
        "entry_id": entry["id"],
        "nickname": entry["nickname"],
        "champion": entry["champion"],
        "action": action,
    })

    return jsonify({
        "status": "ok",
        "action": action,
        "id": entry["id"],
    })


@worldcup.route("/worldcup/api/entries", methods=["GET"])
def get_entries():
    """Return entry count and public data (no real names)."""
    entries = _all_entries()
    public = [
        {
            "nickname": e["nickname"],
            "id": e["id"],
            "paid": e.get("paid", False),
            "champion": e.get("champion", ""),
            "submitted": e.get("submitted", ""),
        }
        for e in entries
    ]
    return jsonify({"count": len(public), "entries": public})


@worldcup.route("/worldcup/api/entry/<entry_id>", methods=["GET"])
def get_entry(entry_id):
    """Return a single entry's public data (picks + champion, no real name)."""
    entity = _get_entry(entry_id)
    if not entity:
        return jsonify({"error": "Entry not found"}), 404
    return jsonify({
        "id": entity["id"],
        "nickname": entity["nickname"],
        "champion": entity["champion"],
        "picks": entity["picks"],
        "submitted": entity["submitted"],
    })


@worldcup.route("/worldcup/api/stats", methods=["GET"])
def get_stats():
    """Return aggregate statistics across all entries."""
    entries = _all_entries()
    if not entries:
        return jsonify({"count": 0})

    total = len(entries)

    # Champion picks distribution
    champ_counts = {}
    for e in entries:
        c = e.get("champion", "")
        if c:
            champ_counts[c] = champ_counts.get(c, 0) + 1
    champ_ranked = sorted(champ_counts.items(), key=lambda x: -x[1])

    # Team popularity per round — how many times each team appears in each round
    rounds = ["R32", "R16", "QF", "SF", "Final"]
    round_team_counts = {}
    for round_name in rounds:
        team_counts = {}
        for e in entries:
            picks = e.get("picks", {}).get(round_name, {})
            for match_id, team in picks.items():
                if team:
                    team_counts[team] = team_counts.get(team, 0) + 1
        round_team_counts[round_name] = sorted(team_counts.items(), key=lambda x: -x[1])

    # Most popular pick per round (top team)
    round_favorites = {}
    for round_name in rounds:
        teams = round_team_counts[round_name]
        if teams:
            round_favorites[round_name] = {
                "team": teams[0][0],
                "count": teams[0][1],
                "total": total,
            }

    # Unique teams picked per round (how many different teams appear)
    round_diversity = {}
    for round_name in rounds:
        round_diversity[round_name] = len(round_team_counts[round_name])

    # "Deepest run" — for each team, what's the latest round anyone picked them
    team_deepest = {}
    round_depth = {r: i for i, r in enumerate(rounds)}
    round_depth["champion"] = len(rounds)
    for e in entries:
        for round_name in rounds:
            picks = e.get("picks", {}).get(round_name, {})
            for match_id, team in picks.items():
                if team:
                    prev = team_deepest.get(team, -1)
                    if round_depth[round_name] > prev:
                        team_deepest[team] = round_depth[round_name]
        c = e.get("champion", "")
        if c:
            team_deepest[c] = round_depth["champion"]

    # Build survival data: for each team picked as champion, how many picks they got per round
    survival = {}
    for team, _ in champ_ranked[:8]:  # top 8 champion picks
        survival[team] = {}
        for round_name in rounds:
            count = 0
            for e in entries:
                picks = e.get("picks", {}).get(round_name, {})
                if team in picks.values():
                    count += 1
            survival[team][round_name] = count
        # Champion round
        survival[team]["Champion"] = champ_counts.get(team, 0)

    # Paid vs unpaid
    paid_count = sum(1 for e in entries if e.get("paid", False))

    return jsonify({
        "count": total,
        "champion_picks": champ_ranked,
        "round_favorites": round_favorites,
        "round_team_counts": round_team_counts,
        "round_diversity": round_diversity,
        "survival": survival,
        "paid": paid_count,
        "unpaid": total - paid_count,
        "last_submitted": max(e.get("submitted", "") for e in entries),
    })


# --- Admin API routes ---

@worldcup.route("/worldcup/api/admin/entries", methods=["GET"])
def admin_entries():
    """Return all entries with full data for admin."""
    entries = _all_entries()
    result = []
    for e in entries:
        result.append({
            "id": e["id"],
            "name": e.get("name", ""),
            "nickname": e["nickname"],
            "champion": e.get("champion", ""),
            "paid": e.get("paid", False),
            "submitted": e.get("submitted", ""),
        })
    return jsonify({"entries": result})


@worldcup.route("/worldcup/api/admin/toggle-paid/<entry_id>", methods=["POST"])
def admin_toggle_paid(entry_id):
    """Toggle the paid status of an entry."""
    entity = _get_entry(entry_id)
    if not entity:
        return jsonify({"error": "Entry not found"}), 404

    entity["paid"] = not entity.get("paid", False)
    key = ds.key("BracketEntry", entry_id)
    ds.put(entity)

    _log_event("admin_toggle_paid", {
        "entry_id": entry_id,
        "paid": entity["paid"],
    })

    return jsonify({"status": "ok", "id": entry_id, "paid": entity["paid"]})


@worldcup.route("/worldcup/api/admin/delete/<entry_id>", methods=["DELETE"])
def admin_delete(entry_id):
    """Delete an entry."""
    entity = _get_entry(entry_id)
    if not entity:
        return jsonify({"error": "Entry not found"}), 404

    key = ds.key("BracketEntry", entry_id)
    ds.delete(key)

    _log_event("admin_delete", {
        "entry_id": entry_id,
        "nickname": entity.get("nickname", ""),
    })

    return jsonify({"status": "ok", "id": entry_id})
