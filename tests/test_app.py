import pytest
from fastapi.testclient import TestClient
from src.app import app

@pytest.fixture
def client():
    return TestClient(app)

def test_redirect_to_static(client):
    """Test that root path redirects to static/index.html"""
    response = client.get("/")
    # FastAPI automatically handles redirects in test client
    assert response.status_code == 200  
    # Still verify we're getting the index.html content
    assert "Mergington High School" in response.text

def test_get_activities(client):
    """Test getting all activities"""
    response = client.get("/activities")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert len(data) > 0
    # Test structure of an activity
    activity = next(iter(data.values()))
    assert "description" in activity
    assert "schedule" in activity
    assert "max_participants" in activity
    assert "participants" in activity
    assert isinstance(activity["participants"], list)

def test_signup_for_activity(client):
    """Test signing up for an activity"""
    activity_name = "Chess Club"
    email = "test@mergington.edu"
    
    # Try to sign up
    response = client.post(f"/activities/{activity_name}/signup?email={email}")
    assert response.status_code == 200
    
    # Verify the signup worked
    activities = client.get("/activities").json()
    assert email in activities[activity_name]["participants"]

def test_signup_for_nonexistent_activity(client):
    """Test signing up for an activity that doesn't exist"""
    response = client.post("/activities/NonexistentClub/signup?email=test@mergington.edu")
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"

def test_duplicate_signup(client):
    """Test that a student cannot sign up twice for the same activity"""
    activity_name = "Programming Class"
    email = "duplicate@mergington.edu"
    
    # First signup should succeed
    response = client.post(f"/activities/{activity_name}/signup?email={email}")
    assert response.status_code == 200
    
    # Second signup should fail
    response = client.post(f"/activities/{activity_name}/signup?email={email}")
    assert response.status_code == 400
    assert response.json()["detail"] == "Student is already signed up"

def test_delete_participant(client):
    """Test removing a participant from an activity"""
    activity_name = "Art Studio"
    email = "remove@mergington.edu"
    
    # First sign up the participant
    client.post(f"/activities/{activity_name}/signup?email={email}")
    
    # Then remove them
    response = client.delete(f"/activities/{activity_name}/participants/{email}")
    assert response.status_code == 200
    
    # Verify they were removed
    activities = client.get("/activities").json()
    assert email not in activities[activity_name]["participants"]

def test_delete_nonexistent_participant(client):
    """Test removing a participant that isn't signed up"""
    response = client.delete("/activities/Chess Club/participants/notreal@mergington.edu")
    assert response.status_code == 404
    assert response.json()["detail"] == "Student is not signed up for this activity"