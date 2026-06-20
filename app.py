import re
import xml.etree.ElementTree as ET
import requests
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Atom feed namespace
ATOM_NS = {'ns': 'http://www.w3.org/2005/Atom'}

def clean_html(raw_html):
    """
    Strips HTML tags to create clean plain text for tweeting.
    Converts list items and paragraphs to nice lines.
    """
    if not raw_html:
        return ""
    # Replace list items with bullet points
    text = re.sub(r'<li>', '• ', raw_html)
    # Replace paragraph and line breaks with newlines
    text = re.sub(r'</p>|<br\s*/?>|</li>', '\n', text)
    # Strip remaining HTML tags
    clean = re.compile(r'<.*?>')
    text = re.sub(clean, '', text)
    # Resolve basic HTML entities
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
    # Clean up excessive newlines
    text = re.sub(r'\n\s*\n', '\n\n', text)
    return text.strip()

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        xml_content = response.content
        root = ET.fromstring(xml_content)
        
        entries = []
        # Generate a unique counter for each sub-update to make referencing in UI easy
        item_id_counter = 0
        
        for entry in root.findall('ns:entry', ATOM_NS):
            title_elem = entry.find('ns:title', ATOM_NS)
            date_str = title_elem.text if title_elem is not None else 'Unknown Date'
            
            link_elem = entry.find("ns:link[@rel='alternate']", ATOM_NS)
            link = link_elem.get('href') if link_elem is not None else ''
            
            content_elem = entry.find('ns:content', ATOM_NS)
            content_html = content_elem.text if content_elem is not None else ''
            
            sub_updates = []
            parts = re.split(r'<h3>(.*?)</h3>', content_html)
            
            if len(parts) > 1:
                # parts[0] is content before first <h3>, usually empty
                for i in range(1, len(parts), 2):
                    update_type = parts[i].strip()
                    html_content = parts[i+1].strip() if i+1 < len(parts) else ''
                    plain_text = clean_html(html_content)
                    
                    item_id_counter += 1
                    sub_updates.append({
                        'id': f"update-{item_id_counter}",
                        'type': update_type,
                        'htmlContent': html_content,
                        'plainText': plain_text
                    })
            else:
                plain_text = clean_html(content_html)
                item_id_counter += 1
                sub_updates.append({
                    'id': f"update-{item_id_counter}",
                    'type': 'Update',
                    'htmlContent': content_html,
                    'plainText': plain_text
                })
                
            entries.append({
                'date': date_str,
                'link': link,
                'updates': sub_updates
            })
            
        return {'status': 'success', 'data': entries}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    result = fetch_and_parse_feed()
    if result['status'] == 'error':
        return jsonify(result), 500
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
