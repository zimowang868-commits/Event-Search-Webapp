# Event Search Web App (Ticketmaster + Flask)

This repository contains a small web application that allows users to search for events around a given location using the Ticketmaster Discovery API. It was originally developed as a course assignment and then refactored into a standalone demo project.

## 1. Overview

The app provides a single-page experience where users can:

- Search events by **keyword**, **category**, and **distance (miles)**.
- Use **auto-detected location (IP-based)** or manually input a location.
- View events in a **sortable table** (by event name, genre, venue, etc.).
- Click an event to see **detailed information**:
  - Date and time
  - Artist / team
  - Venue
  - Genres
  - Price range
  - Ticket status and a link to buy tickets
  - Seat map (if available)
- Optionally fetch and display **venue details** (e.g., address, external links).

This project showcases full-stack skills: a Flask backend, a REST API integration, and a custom HTML/CSS/JS frontend with dynamic interactions.

## 2. Tech Stack

- **Backend**: Python, Flask, requests, geolib (geohash)
- **Frontend**: HTML, CSS, vanilla JavaScript
- **APIs**:
  - Ticketmaster Discovery API (events & venues)
  - IPinfo (for IP-based geolocation)
  - Google Maps Geocoding API (for converting addresses to coordinates)
- **Deployment**: Designed to work with Gunicorn / Google App Engine via `app.yaml` (optional)

## 3. Project Structure

```text
.
├── main.py              # Flask application and API endpoints
├── requirements.txt     # Python dependencies
├── app.yaml             # (Optional) App Engine / deployment config
└── static/
    ├── webpage.html     # Main single-page UI
    ├── styles.css       # Styling for the page
    └── interactions.js  # Frontend logic and API calls