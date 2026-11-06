from __future__ import annotations

import math
from typing import Any

from flask import Flask, jsonify, request


def calculate_cost(
    km_per_liter_gas_city: float,
    km_per_liter_gas_highway: float,
    km_per_liter_alcool_city: float,
    km_per_liter_alcool_highway: float,
    price_per_liter_gas: float,
    price_per_liter_alcool: float,
) -> dict[str, float]:
    values = (km_per_liter_gas_city, km_per_liter_gas_highway, km_per_liter_alcool_city, km_per_liter_alcool_highway, price_per_liter_gas, price_per_liter_alcool)
    if any(isinstance(value, bool) or not isinstance(value, (int, float)) for value in values):
        raise ValueError("Informe valores numéricos.")
    if not all(math.isfinite(value) for value in values):
        raise ValueError("Os valores devem ser finitos.")
    if km_per_liter_gas_city <= 0 or km_per_liter_gas_highway <= 0 or km_per_liter_alcool_city <= 0 or km_per_liter_alcool_highway <= 0 or price_per_liter_gas < 0 or price_per_liter_alcool < 0:
        raise ValueError("Os valores devem ser maiores que zero; preço não pode ser negativo.")

    cost_per_km_gas_city = price_per_liter_gas / km_per_liter_gas_city
    cost_per_km_gas_highway = price_per_liter_gas / km_per_liter_gas_highway
    cost_per_km_alcool_city = price_per_liter_alcool / km_per_liter_alcool_city
    cost_per_km_alcool_highway = price_per_liter_alcool / km_per_liter_alcool_highway
    return {
        "cost_per_km_gas_city": round(cost_per_km_gas_city, 2),
        "cost_per_km_gas_highway": round(cost_per_km_gas_highway, 2),
        "cost_per_km_alcool_city": round(cost_per_km_alcool_city, 2),
        "cost_per_km_alcool_highway": round(cost_per_km_alcool_highway, 2),
    }

def calculate_winners(cost_per_km_gas_city: float, cost_per_km_gas_highway: float, cost_per_km_alcool_city: float, cost_per_km_alcool_highway: float) -> dict[str, str]:
    winner_city = "Gasolina" if cost_per_km_gas_city <= cost_per_km_alcool_city else "Etanol"
    winner_highway = "Gasolina" if cost_per_km_gas_highway <= cost_per_km_alcool_highway else "Etanol"
    return {
        "winner_city": winner_city,
        "winner_highway": winner_highway
    }

def create_app() -> Flask:
    app = Flask(__name__)

    @app.after_request
    def add_cors_headers(response: Any) -> Any:
        if request.path == "/api/calculate":
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        return response

    @app.route("/api/calculate", methods=["POST", "OPTIONS"])
    def calculate() -> Any:
        if request.method == "OPTIONS":
            return "", 204

        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(error="Envie os dados em formato JSON."), 400

        try:
            field_names = (
                "km_per_liter_gas_city",
                "km_per_liter_gas_highway",
                "km_per_liter_alcool_city",
                "km_per_liter_alcool_highway",
                "price_per_liter_gas",
                "price_per_liter_alcool",
            )
            values = []
            for name in field_names:
                value = payload.get(name)
                if isinstance(value, bool) or value is None or str(value).strip() == "":
                    raise ValueError("Preencha os seis campos com valores numéricos.")
                values.append(float(value))

            result = calculate_cost(*values)
            result.update(
                calculate_winners(
                    result["cost_per_km_gas_city"],
                    result["cost_per_km_gas_highway"],
                    result["cost_per_km_alcool_city"],
                    result["cost_per_km_alcool_highway"],
                )
            )
        except (OverflowError, TypeError, ValueError) as error:
            return jsonify(error=str(error)), 400

        return jsonify(result)

    return app


if __name__ == "__main__":
    create_app().run(debug=True)