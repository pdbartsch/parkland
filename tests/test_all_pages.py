def test_main_routes(client):
    """Test Main Blueprint routes"""
    # Home page
    response = client.get('/')
    assert response.status_code == 200
    assert b"Welcome to ParkLand!" in response.data

    # Other page
    response = client.get('/other')
    assert response.status_code == 200
    assert b"Other" in response.data

def test_games_routes(client):
    """Test Games Blueprint routes"""
    # Games Hub
    response = client.get('/games')
    assert response.status_code == 200
    assert b"Games" in response.data

    # Sum Smash
    response = client.get('/sum_smash')
    assert response.status_code == 200
    assert b"Sum Smash" in response.data

def test_visualizations_routes(client):
    """Test Visualizations Blueprint routes"""
    # Visualizations Hub
    response = client.get('/visualizations')
    assert response.status_code == 200
    assert b"Visualizations" in response.data

    # Election Map
    response = client.get('/election_map')
    assert response.status_code == 200
    assert b"Election Map" in response.data

def test_words_routes(client):
    """Test Words Blueprint routes"""
    # Words Hub
    response = client.get('/words')
    assert response.status_code == 200
    assert b"Sight Words" in response.data

    # Current Words
    response = client.get('/words/current')
    assert response.status_code == 200
    assert b"Current Words" in response.data

    # All Words
    response = client.get('/words/all')
    assert response.status_code == 200
    assert b"All Words" in response.data

    # Color Words
    response = client.get('/words/colors')
    assert response.status_code == 200
    assert b"Colors" in response.data

    # Practice Words
    response = client.get('/words/practice')
    assert response.status_code == 200
    assert b"New or Difficult Words" in response.data

def test_math_routes(client):
    """Test Math Blueprint routes (excluding quizzes which are in test_math_quiz.py)"""
    # Math Hub
    response = client.get('/math')
    assert response.status_code == 200
    assert b"Math Quizzes" in response.data

    # Math Flashcards (Random)
    response = client.get('/math_flash')
    assert response.status_code == 200
    assert b"Current Math Flashcards" in response.data

    # Multiply Flashcards
    response = client.get('/multiply_flash')
    assert response.status_code == 200
    assert b"Current Multiplication Flashcards" in response.data

    # Divide Flashcards
    response = client.get('/divide_flash')
    assert response.status_code == 200
    assert b"Current Division Flashcards" in response.data
