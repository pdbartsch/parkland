# Adding Pages to Parkland

This guide explains how to add new pages or features to the Parkland Flask application.

## Overview
To add a new page, you typically need to:
1.  **Create a Template**: The HTML file that defines the page structure.
2.  **Add a Route**: The Python function in `routes.py` that maps a URL to your template.
3.  **Link it**: Add a link in the navigation (optional).

## Step-by-Step

### 1. Create a Template
Create a new HTML file in the `parklandapp/templates/` directory.
Example: `parklandapp/templates/my_new_page.html`

```html
{% extends "layout.html" %}
{% block content %}
    <div class="content-section">
        <h1>My New Page</h1>
        <p>This is a new page added to the site.</p>
    </div>
{% endblock content %}
```
*Note: Extending `layout.html` ensures your page has the same header/footer as the rest of the site.*

### 2. Add a Route
Open `parklandapp/routes.py` and add a new function decorated with `@app.route`.

```python
@app.route("/my_new_page")
def my_new_page():
    return render_template("my_new_page.html", heading_text="My New Page")
```

### 3. Add Static Files (Optional)
If your page needs custom CSS or JavaScript:
- Place CSS in `parklandapp/static/main.css` (or create a new file).
- Place JS in `parklandapp/static/`.

### 4. Verify
Run the app:
```bash
python run.py
```
Visit `http://localhost:5000/my_new_page` to see your work!

## Adding a React/SPA Feature (Like Sum Smash)
1.  Build your Single Page App (SPA) in a separate folder if complex.
2.  Copy the final HTML file to `parklandapp/templates/`.
3.  Add a route in `routes.py` to serve that template.
4.  If you need a backend API, add `@app.route('/api/...')` endpoints in `routes.py` that return `jsonify(...)`.
