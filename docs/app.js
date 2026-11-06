const FIELD_NAMES = [
  "km_per_liter_gas_city",
  "km_per_liter_gas_highway",
  "km_per_liter_alcool_city",
  "km_per_liter_alcool_highway",
  "price_per_liter_gas",
  "price_per_liter_alcool",
];

const REPORT_ROWS = [
  { id: "gas-city-result", value: "cost_per_km_gas_city" },
  { id: "ethanol-city-result", value: "cost_per_km_alcool_city" },
  { id: "gas-road-result", value: "cost_per_km_gas_highway" },
  { id: "ethanol-road-result", value: "cost_per_km_alcool_highway" },
];

export function calculateCost(
  kmPerLiterGasCity,
  kmPerLiterGasHighway,
  kmPerLiterAlcoolCity,
  kmPerLiterAlcoolHighway,
  pricePerLiterGas,
  pricePerLiterAlcool,
) {
  const values = [
    kmPerLiterGasCity,
    kmPerLiterGasHighway,
    kmPerLiterAlcoolCity,
    kmPerLiterAlcoolHighway,
    pricePerLiterGas,
    pricePerLiterAlcool,
  ];

  if (values.some((value) => typeof value !== "number")) {
    throw new TypeError("Informe valores numéricos.");
  }
  if (values.some((value) => !Number.isFinite(value))) {
    throw new RangeError("Os valores devem ser finitos.");
  }
  if (values.slice(0, 4).some((value) => value <= 0)
      || values.slice(4).some((value) => value < 0)) {
    throw new RangeError("Consumo deve ser maior que zero e preço não pode ser negativo.");
  }

  const costs = {
    cost_per_km_gas_city: pricePerLiterGas / kmPerLiterGasCity,
    cost_per_km_gas_highway: pricePerLiterGas / kmPerLiterGasHighway,
    cost_per_km_alcool_city: pricePerLiterAlcool / kmPerLiterAlcoolCity,
    cost_per_km_alcool_highway: pricePerLiterAlcool / kmPerLiterAlcoolHighway,
  };

  if (Object.values(costs).some((value) => !Number.isFinite(value))) {
    throw new RangeError("O custo calculado está fora do intervalo permitido.");
  }

  return Object.fromEntries(
    Object.entries(costs).map(([name, value]) => [name, Math.round((value + Number.EPSILON) * 100) / 100]),
  );
}

export function calculateWinners(
  costPerKmGasCity,
  costPerKmGasHighway,
  costPerKmAlcoolCity,
  costPerKmAlcoolHighway,
) {
  const costs = [costPerKmGasCity, costPerKmGasHighway, costPerKmAlcoolCity, costPerKmAlcoolHighway];
  if (costs.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    throw new TypeError("Os custos devem ser números finitos.");
  }

  return {
    winner_city: costPerKmGasCity <= costPerKmAlcoolCity ? "Gasolina" : "Etanol",
    winner_highway: costPerKmGasHighway <= costPerKmAlcoolHighway ? "Gasolina" : "Etanol",
  };
}

export function initializeCalculator(document) {
  const form = document.querySelector("#comparison-form");
  if (!form) return;

  const result = document.querySelector("#result");
  const emptyReport = document.querySelector("#report-empty");
  const errorMessage = document.querySelector("#form-error");
  const currencyFormat = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    errorMessage.hidden = true;

    try {
      const values = FIELD_NAMES.map((name) => {
        const rawValue = form.elements.namedItem(name).value.trim();
        if (rawValue === "") throw new TypeError("Preencha os seis campos com valores numéricos.");
        return Number(rawValue);
      });
      const costs = calculateCost(...values);
      const winners = calculateWinners(
        costs.cost_per_km_gas_city,
        costs.cost_per_km_gas_highway,
        costs.cost_per_km_alcool_city,
        costs.cost_per_km_alcool_highway,
      );

      showResults(document, currencyFormat, { ...costs, ...winners });
      emptyReport.hidden = true;
      result.hidden = false;
    } catch (error) {
      result.hidden = true;
      emptyReport.hidden = false;
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
    }
  });
}

function showResults(document, currencyFormat, data) {
  REPORT_ROWS.forEach(({ id, value }) => {
    const row = document.querySelector(`#${id}`);
    row.querySelector("strong").textContent = currencyFormat.format(data[value]);
    row.classList.remove("winner");
    row.querySelector(".winner-label").hidden = true;
  });

  markWinner(document, data.winner_city === "Gasolina" ? "gas-city-result" : "ethanol-city-result");
  markWinner(document, data.winner_highway === "Gasolina" ? "gas-road-result" : "ethanol-road-result");
}

function markWinner(document, rowId) {
  const row = document.querySelector(`#${rowId}`);
  row.classList.add("winner");
  row.querySelector(".winner-label").hidden = false;
}

if (typeof document !== "undefined") {
  initializeCalculator(document);
}