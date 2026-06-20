# BigQuery Release Notes Hub

A modern, responsive, and lightweight web application built with **Python Flask** and **Vanilla HTML/JS/CSS** that fetches, aggregates, and organizes Google Cloud BigQuery Release Notes. It allows developers to browse, filter, search updates by type, and easily compile custom Twitter (X) drafts to share specific announcements within character limits.

---

## 🚀 Features

- **Real-time Aggregation**: Bypasses browser CORS restrictions by proxying the official Atom RSS feed via Flask.
- **Intelligent Segmentation**: Automatically splits composite multi-update entries into individual cards based on update type (`Feature`, `Announcement`, `Breaking`, `Issue`, `Change`).
- **Premium Dark UI**: Built with responsive CSS grids, glowing background decorations, custom status pulses, and glassmorphic card designs.
- **Client-Side Search & Filters**: Instant fuzzy search matching keywords across update body text, types, and dates.
- **Integrated Twitter Share Modal**: Renders custom draft tweets showing release notes, formatting links, and trimming bodies to fit within the **280-character limit** before opening X's sharing intent.

---

## 🛠️ Project Structure

```
bq-releases-notes/
├── app.py                  # Flask Application & XML Parser logic
├── requirements.txt        # Python backend dependencies
├── .gitignore              # Git ignore rules (venv, tools, caches)
├── templates/
│   └── index.html          # Semantic HTML SPA structure & modal layouts
└── static/
    ├── css/
    │   └── style.css       # Custom design system and layout configurations
    └── js/
        └── main.js         # API interface, state filtering, and modal bindings
```

---

## 💻 Getting Started

### Prerequisites
- Python 3.8 or higher installed on your system.

### 1. Installation
Clone or navigate to the project directory and create a Python virtual environment:

```bash
# Navigate to the folder
cd bq-releases-notes

# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install required packages
pip install -r requirements.txt
```

### 2. Running Locally
Run the Flask application with:

```bash
python app.py
```

The application will launch on **http://127.0.0.1:5000** by default. Open this link in your browser to view the hub.

---

## ⚙️ Technical Details

### Backend
- **Feed Ingestion**: Downloads feed XML from `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`.
- **XML Parsing**: Uses Python's standard `xml.etree.ElementTree` parser configured to support namespaces.
- **HTML Sanitization**: Cleans markup to plain text format, substituting `<li>` tag elements with custom bullets for Twitter.

### Frontend
- **State Handling**: Caches loaded results inside local JS states to support instant filtering without repeating API requests.
- **Responsive Layout**: Adapts cleanly from full-screen desktop screens down to single-column phone screens.
