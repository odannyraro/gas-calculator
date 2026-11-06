from __future__ import annotations

import math
from typing import Any

from flask import Flask, jsonify, request


def calculate_trip(
    distance_km: float,
    efficiency_km_per_liter: float,
    price_per_liter: float,
) -> dict[str, float]:
    values = (distance_km, efficiency_km_per_liter, price_per_liter)
    if any(isinstance(value, bool) or not isinstance(value, (int, float)) for value in values):
        raise ValueError("Informe valores numéricos.")
    if not all(math.isfinite(value) for value in values):
        raise ValueError("Os valores devem ser finitos.")
    if distance_km <= 0 or efficiency_km_per_liter <= 0 or price_per_liter < 0:
        raise ValueError("Distância e consumo devem ser maiores que zero; preço não pode ser negativo.")

    liters = distance_km / efficiency_km_per_liter
    return {
        "liters": round(liters, 2),
        "total_cost": round(liters * price_per_liter, 2),
    }


def create_app() -> Flask:
    app = Flask(__name__)

    @app.post("/api/calculate")
    def calculate() -> Any:
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(error="Envie os dados em formato JSON."), 400

        try:
            result = calculate_trip(
                payload.get("distance_km"),
                payload.get("efficiency_km_per_liter"),
                payload.get("price_per_liter"),
            )
        except ValueError as error:
            return jsonify(error=str(error)), 400

        return jsonify(result)

    return app


if __name__ == "__main__":
    create_app().run(debug=True)