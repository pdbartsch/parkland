import sqlite3
from flask import Flask, render_template, request, jsonify
from datetime import datetime

app = Flask(__name__)
DB_NAME = "game.db"

def init_db():
    """Initialize the SQLite database with a scores table."""
    with sqlite3.connect(DB_NAME) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_uuid TEXT NOT NULL,
                display_name TEXT NOT NULL,
                turns INTEGER NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        # Create an index for faster leaderboard lookups
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_turns ON scores (turns ASC)')
        conn.commit()

@app.route('/')
def index():
    """Serve the Single Page App."""
    return render_template('index.html')

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Fetch top 20 scores."""
    try:
        with sqlite3.connect(DB_NAME) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            # Get top 20 scores, lower turns is better
            cursor.execute('''
                SELECT display_name, turns, timestamp 
                FROM scores 
                ORDER BY turns ASC 
                LIMIT 20
            ''')
            rows = cursor.fetchall()
            results = [dict(row) for row in rows]
            return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/personal_best', methods=['GET'])
def get_personal_best():
    """Fetch the best score for a specific user UUID."""
    user_uuid = request.args.get('uuid')
    if not user_uuid:
        return jsonify({"error": "UUID required"}), 400
        
    try:
        with sqlite3.connect(DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT turns FROM scores 
                WHERE user_uuid = ? 
                ORDER BY turns ASC 
                LIMIT 1
            ''', (user_uuid,))
            row = cursor.fetchone()
            return jsonify({"best_turns": row[0] if row else None})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/submit_score', methods=['POST'])
def submit_score():
    """Save a new game score."""
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        user_uuid = data.get('uuid')
        name = data.get('name')
        turns = data.get('turns')

        if not all([user_uuid, name, turns is not None]):
            return jsonify({"error": "Missing fields"}), 400

        with sqlite3.connect(DB_NAME) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO scores (user_uuid, display_name, turns)
                VALUES (?, ?, ?)
            ''', (user_uuid, name, turns))
            conn.commit()
            
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)