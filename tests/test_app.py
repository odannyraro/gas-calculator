import pytest

from backend.app import calculate_cost, calculate_winners, create_app


@pytest.fixture
def client():
    return create_app().test_client()


def test_calculate_cost_returns_correct_values():
    result = calculate_cost(10.5, 13, 7.2, 8.5, 5.89, 3.99)
    assert result == {
        "cost_per_km_gas_city": 0.56,
        "cost_per_km_gas_highway": 0.45,
        "cost_per_km_alcool_city": 0.55,
        "cost_per_km_alcool_highway": 0.47,
    }


@pytest.mark.parametrize(
    "values",
    [
        (0, 13, 7.2, 8.5, 5.89, 3.99),
        (10.5, -1, 7.2, 8.5, 5.89, 3.99),
    ],
    ids=["zero-city-consumption", "negative-highway-consumption"],
)
def test_calculate_cost_rejects_non_positive_consumption(values):
    with pytest.raises(ValueError):
        calculate_cost(*values)


@pytest.mark.parametrize("value", ["", "inválido", []], ids=["empty", "text", "list"])
def test_calculate_cost_rejects_non_numeric_values(value):
    with pytest.raises(ValueError):
        calculate_cost(10.5, 13, value, 8.5, 5.89, 3.99)


def test_calculate_winners_chooses_lowest_cost():
    result = calculate_winners(0.56, 0.45, 0.55, 0.47)

    assert result == {"winner_city": "Etanol", "winner_highway": "Gasolina"}


def test_calculate_endpoint_returns_costs_and_winners(client):
    response = client.post(
        "/api/calculate",
        json={
            "km_per_liter_gas_city": 10.5,
            "km_per_liter_gas_highway": 13,
            "km_per_liter_alcool_city": 7.2,
            "km_per_liter_alcool_highway": 8.5,
            "price_per_liter_gas": 5.89,
            "price_per_liter_alcool": 3.99,
        },
    )

    assert response.status_code == 200
    assert response.get_json() == {
        "cost_per_km_gas_city": 0.56,
        "cost_per_km_gas_highway": 0.45,
        "cost_per_km_alcool_city": 0.55,
        "cost_per_km_alcool_highway": 0.47,
        "winner_city": "Etanol",
        "winner_highway": "Gasolina",
    }


@pytest.mark.parametrize(
    "payload",
    [
        {"km_per_liter_gas_city": 0},
        {"price_per_liter_gas": -1},
        {"km_per_liter_gas_city": ""},
        {"km_per_liter_gas_city": "inválido"},
        {"km_per_liter_gas_city": []},
    ],
)
def test_calculate_endpoint_rejects_invalid_values(client, payload):
    valid_payload = {
        "km_per_liter_gas_city": 10.5,
        "km_per_liter_gas_highway": 13,
        "km_per_liter_alcool_city": 7.2,
        "km_per_liter_alcool_highway": 8.5,
        "price_per_liter_gas": 5.89,
        "price_per_liter_alcool": 3.99,
    }
    valid_payload.update(payload)
    response = client.post("/api/calculate", json=valid_payload)

    assert response.status_code == 400
    assert "error" in response.get_json()


def test_calculate_endpoint_rejects_non_json(client):
    response = client.post("/api/calculate", data="not json")

    assert response.status_code == 400
    assert "error" in response.get_json()


def test_calculate_endpoint_supports_cors_preflight(client):
    response = client.options("/api/calculate", headers={"Origin": "https://odannyraro.github.io"})

    assert response.status_code == 204
    assert response.headers["Access-Control-Allow-Origin"] == "*"
    assert response.headers["Access-Control-Allow-Methods"] == "POST, OPTIONS"