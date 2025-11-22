def test_home_page(client):
    response = client.get('/')
    assert response.status_code == 200
    assert b"Welcome to ParkLand!" in response.data

def test_sum_smash_route(client):
    response = client.get('/sum_smash')
    assert response.status_code == 200
    # Check for a unique string in the sum_smash template
    assert b"Sum Smash" in response.data

def test_election_map_route(client):
    response = client.get('/election_map')
    assert response.status_code == 200
    # Check for a unique string in the election_map template
    assert b"Election Map" in response.data
