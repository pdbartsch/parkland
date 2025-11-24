import pytest
import json
import uuid

def test_submit_score(client):
    """Test submitting a new score"""
    user_uuid = str(uuid.uuid4())
    data = {
        'uuid': user_uuid,
        'name': 'Test User',
        'turns': 10
    }
    
    response = client.post('/api/submit_score', 
                         data=json.dumps(data),
                         content_type='application/json')
    
    assert response.status_code == 200
    assert response.json['success'] is True

def test_submit_score_missing_data(client):
    """Test submitting incomplete data"""
    data = {
        'name': 'Test User'
        # Missing uuid and turns
    }
    
    response = client.post('/api/submit_score', 
                         data=json.dumps(data),
                         content_type='application/json')
    
    assert response.status_code == 400
    assert 'error' in response.json

def test_get_leaderboard(client):
    """Test fetching the leaderboard"""
    # First submit a score to ensure there's data
    user_uuid = str(uuid.uuid4())
    client.post('/api/submit_score', 
              data=json.dumps({'uuid': user_uuid, 'name': 'Leader', 'turns': 5}),
              content_type='application/json')

    response = client.get('/api/leaderboard')
    
    assert response.status_code == 200
    data = response.json
    assert isinstance(data, list)
    assert len(data) > 0
    assert data[0]['display_name'] == 'Leader'
    assert data[0]['turns'] == 5

def test_get_personal_best(client):
    """Test fetching personal best score"""
    user_uuid = str(uuid.uuid4())
    
    # Submit two scores, one better (lower) than the other
    client.post('/api/submit_score', 
              data=json.dumps({'uuid': user_uuid, 'name': 'PB User', 'turns': 20}),
              content_type='application/json')
    client.post('/api/submit_score', 
              data=json.dumps({'uuid': user_uuid, 'name': 'PB User', 'turns': 15}),
              content_type='application/json')

    response = client.get(f'/api/personal_best?uuid={user_uuid}')
    
    assert response.status_code == 200
    assert response.json['best_turns'] == 15

def test_get_personal_best_no_uuid(client):
    """Test fetching personal best without UUID"""
    response = client.get('/api/personal_best')
    assert response.status_code == 400
    assert 'error' in response.json
