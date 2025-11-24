import os
from dotenv import load_dotenv

load_dotenv()

# Define the template
app_yaml_content = """runtime: python310
entrypoint: gunicorn -b :$PORT "parklandapp:create_app()"

env_variables:
"""

# List of required environment variables
required_vars = [
    "SECRET_KEY",
    "DB_USER",
    "DB_PW",
    "DB_URL",
    "DB_DB",
    "DB_PROJECT_ID",
    "DB_INSTANCE_NAME",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
]

# Append variables to content
for var in required_vars:
    value = os.environ.get(var)
    if value is None:
        print(f"Warning: {var} not found in environment variables.")
        value = "MISSING_VALUE"
    # Wrap in quotes to handle potential special characters
    app_yaml_content += f'  {var}: "{value}"\n'

# Write to app.yaml
with open("app.yaml", "w") as f:
    f.write(app_yaml_content)

print("app.yaml has been updated from .env")
