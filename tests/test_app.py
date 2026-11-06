import pytest

from backend.app import calculate_trip, create_app


@pytest.fixture
def client():
    return create_app().test_client()


def test_calculate_trip_returns_liters_and_cost():
    result = calculate_trip(300, 12, 5.99)

    assert result == {"liters": 25.0, "total_cost": 149.75}


def test_calculate_endpoint_returns_result(client):
    response = client.post(
        "/api/calculate",
        json={
            "distance_km": 300,
            "efficiency_km_per_liter": 12,
            "price_per_liter": 5.99,
        },
    )

    assert response.status_code == 200
    assert response.get_json() == {"liters": 25.0, "total_cost": 149.75}


@pytest.mark.parametrize(
    "payload",
    [
        {"distance_km": 0, "efficiency_km_per_liter": 12, "price_per_liter": 5.99},
        {"distance_km": 300, "efficiency_km_per_liter": 0, "price_per_liter": 5.99},
        {"distance_km": 300, "efficiency_km_per_liter": 12, "price_per_liter": -1},
        {"distance_km": "300", "efficiency_km_per_liter": 12, "price_per_liter": 5.99},
    ],
)
def test_calculate_endpoint_rejects_invalid_values(client, payload):
    response = client.post("/api/calculate", json=payload)

    assert response.status_code == 400
    assert "error" in response.get_json()


def test_calculate_endpoint_rejects_non_json(client):
    response = client.post("/api/calculate", data="not json")

    assert response.status_code == 400
    assert "error" in response.get_json()