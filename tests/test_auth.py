import pytest
from parklandapp import create_app
from flask import session, url_for

@pytest.fixture
def app():
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SECRET_KEY": "test_secret",
        "ALLOWED_USERS": ["test@example.com"],
        "GOOGLE_CLIENT_ID": "test_id",
        "GOOGLE_CLIENT_SECRET": "test_secret"
    })
    return app

@pytest.fixture
def client(app):
    return app.test_client()

def test_login_redirect(client):
    response = client.get('/login')
    assert response.status_code == 302
    assert 'accounts.google.com' in response.location

def test_protected_route_access_denied(client):
    response = client.get('/box2box', follow_redirects=True)
    assert "Please log in to access this page." in response.text

def test_logout(client):
    with client.session_transaction() as sess:
        sess['user'] = {'email': 'test@example.com'}
    
    response = client.get('/logout', follow_redirects=True)
    assert "You have been logged out." in response.text
    
    with client.session_transaction() as sess:
        assert 'user' not in sess
