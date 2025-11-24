import pytest
from parklandapp import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False  # Disable CSRF for easier testing
    with app.test_client() as client:
        with app.app_context():
            yield client

def test_multiply_page_loads(client):
    response = client.get('/multiply')
    assert response.status_code == 200
    assert b"Current Multiplication Quiz" in response.data

def test_multiply_submission_correct(client):
    # First get the page to set the session
    client.get('/multiply')
    
    # We need to access the session to know the correct answer
    with client.session_transaction() as sess:
        solution = sess['solution']
    
    response = client.post('/multiply', data={'user_answer': solution}, follow_redirects=True)
    assert response.status_code == 200
    assert b"Correct" in response.data

def test_multiply_submission_incorrect(client):
    # First get the page to set the session
    client.get('/multiply')
    
    with client.session_transaction() as sess:
        solution = sess['solution']
        wrong_answer = solution + 1
        
    response = client.post('/multiply', data={'user_answer': wrong_answer}, follow_redirects=True)
    assert response.status_code == 200
    assert b"Try again" in response.data

def test_divide_page_loads(client):
    response = client.get('/divide')
    assert response.status_code == 200
    assert b"Current Division Quiz" in response.data
