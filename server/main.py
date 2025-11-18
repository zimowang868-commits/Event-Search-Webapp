import os
import requests
from flask import Flask, request, jsonify, send_from_directory
from geolib import geohash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="")

TM_API_KEY = os.environ.get("TICKETMASTER_API_KEY", "")

SEGMENT_IDS = {
    "Music": "KZFzniwnSyZfZ7v7nJ",
    "Sports": "KZFzniwnSyZfZ7v7nE",
    "Arts": "KZFzniwnSyZfZ7v7na",
    "Theatre": "KZFzniwnSyZfZ7v7na",
    "Film": "KZFzniwnSyZfZ7v7nn",
    "Miscellaneous": "KZFzniwnSyZfZ7v7n1"
}

@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "webpage.html")

@app.get("/api/search")
def api_search():
    keyword = (request.args.get("keyword") or "").strip()
    distance = (request.args.get("distance") or "10").strip()
    category = (request.args.get("category") or "").strip()
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if not TM_API_KEY:
        return jsonify({"error": "server missing Ticketmaster API key"}), 500
    if not keyword:
        return jsonify({"error": "keyword required"}), 400
    if not lat or not lon:
        return jsonify({"error": "lat/lon required"}), 400

    try:
        geo_point = geohash.encode(float(lat), float(lon), 7)
    except Exception as e:
        return jsonify({"error": "geohash encode failed", "detail": str(e)}), 400

    params = {
        "apikey": TM_API_KEY,
        "keyword": keyword,
        "geoPoint": geo_point,
        "radius": distance,
        "unit": "miles",
        "sort": "date,asc",
        "size": "20"
    }
    if category and category in SEGMENT_IDS:
        params["segmentId"] = SEGMENT_IDS[category]

    try:
        r = requests.get(
            "https://app.ticketmaster.com/discovery/v2/events.json",
            params=params,
            timeout=12
        )
        r.raise_for_status()
        return jsonify(r.json())  # 作为“pass-through”返回给前端
    except requests.RequestException as e:
        return jsonify({"error": "Ticketmaster request failed", "detail": str(e)}), 502

@app.get("/api/event")
def api_event_detail():
    if not TM_API_KEY:
        return jsonify({"error": "server missing Ticketmaster API key"}), 500

    ev_id = (request.args.get("id") or "").strip()
    if not ev_id:
        return jsonify({"error": "id required"}), 400

    url = f"https://app.ticketmaster.com/discovery/v2/events/{ev_id}"
    try:
        r = requests.get(url, params={"apikey": TM_API_KEY}, timeout=12)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.RequestException as e:
        return jsonify({"error": "Ticketmaster event request failed", "detail": str(e)}), 502

@app.get("/api/venue")
def api_venue_search():
    if not TM_API_KEY:
        return jsonify({"error": "server missing Ticketmaster API key"}), 500

    keyword = (request.args.get("keyword") or "").strip()
    if not keyword:
        return jsonify({"error": "keyword required"}), 400

    params = {
        "apikey": TM_API_KEY,
        "keyword": keyword
    }
    try:
        r = requests.get(
            "https://app.ticketmaster.com/discovery/v2/venues",
            params=params,
            timeout=12
        )
        r.raise_for_status()
        return jsonify(r.json())
    except requests.RequestException as e:
        return jsonify({"error": "Ticketmaster venue request failed", "detail": str(e)}), 502

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), debug=True)
