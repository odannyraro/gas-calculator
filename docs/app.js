const FIELD_NAMES = [
  "km_per_liter_gas_city",
  "km_per_liter_gas_highway",
  "km_per_liter_alcool_city",
  "km_per_liter_alcool_highway",
  "price_per_liter_gas",
  "price_per_liter_alcool",
];

const DECIMAL_PLACES = {
  km_per_liter_gas_city: 1,
  km_per_liter_gas_highway: 1,
  km_per_liter_alcool_city: 1,
  km_per_liter_alcool_highway: 1,
  price_per_liter_gas: 2,
  price_per_liter_alcool: 2,
};

const REPORT_ROWS = [
  { id: "gas-city-result", cost: "cost_per_km_gas_city", distance: "km_per_real_gas_city" },
  { id: "ethanol-city-result", cost: "cost_per_km_alcool_city", distance: "km_per_real_alcool_city" },
  { id: "gas-road-result", cost: "cost_per_km_gas_highway", distance: "km_per_real_gas_highway" },
  { id: "ethanol-road-result", cost: "cost_per_km_alcool_highway", distance: "km_per_real_alcool_highway" },
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
  const unitButtons = document.querySelectorAll("[data-result-unit]");
  const currencyFormat = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const distanceFormat = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  let resultData = null;
  let resultUnit = "cost";

  Object.entries(DECIMAL_PLACES).forEach(([name, decimalPlaces]) => {
    const input = form.elements.namedItem(name);
    const formatInput = () => applyImpliedDecimal(input, decimalPlaces);
    input.addEventListener("click", () => {
      input.setSelectionRange(input.value.length, input.value.length);
    });
    input.addEventListener("input", formatInput);
    input.addEventListener("blur", formatInput);
  });

  unitButtons.forEach((button) => {
    button.addEventListener("click", () => {
      resultUnit = button.dataset.resultUnit;
      if (resultData) showResults(document, currencyFormat, distanceFormat, resultData, resultUnit);
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    errorMessage.hidden = true;

    try {
      Object.entries(DECIMAL_PLACES).forEach(([name, decimalPlaces]) => {
        applyImpliedDecimal(form.elements.namedItem(name), decimalPlaces);
      });
      const values = FIELD_NAMES.map((name) => {
        const rawValue = form.elements.namedItem(name).value.trim();
        if (rawValue === "") throw new TypeError("Preencha os seis campos com valores numéricos.");
        return Number(rawValue.replace(",", "."));
      });
      const costs = calculateCost(...values);
      const winners = calculateWinners(
        costs.cost_per_km_gas_city,
        costs.cost_per_km_gas_highway,
        costs.cost_per_km_alcool_city,
        costs.cost_per_km_alcool_highway,
      );

      resultData = {
        ...costs,
        ...winners,
        km_per_real_gas_city: values[0] / values[4],
        km_per_real_gas_highway: values[1] / values[4],
        km_per_real_alcool_city: values[2] / values[5],
        km_per_real_alcool_highway: values[3] / values[5],
      };
      showResults(document, currencyFormat, distanceFormat, resultData, resultUnit);
      emptyReport.hidden = true;
      result.hidden = false;
    } catch (error) {
      resultData = null;
      result.hidden = true;
      emptyReport.hidden = false;
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
    }
  });
}

function applyImpliedDecimal(input, decimalPlaces) {
  const rawValue = input.value.trim();
  const negativeSign = rawValue.startsWith("-") ? "-" : "";
  const digits = rawValue.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) {
    input.value = negativeSign;
    return;
  }

  const paddedDigits = digits.padStart(decimalPlaces + 1, "0");
  const decimalIndex = paddedDigits.length - decimalPlaces;
  input.value = `${negativeSign}${paddedDigits.slice(0, decimalIndex)},${paddedDigits.slice(decimalIndex)}`;
  input.setSelectionRange(input.value.length, input.value.length);
}

function showResults(document, currencyFormat, distanceFormat, data, unit) {
  const showingCost = unit === "cost";
  const unitLabel = showingCost ? "R$/km" : "km/R$";
  REPORT_ROWS.forEach(({ id, cost, distance }) => {
    const row = document.querySelector(`#${id}`);
    const value = showingCost ? data[cost] : data[distance];
    row.querySelector("strong").textContent = showingCost
      ? currencyFormat.format(value)
      : distanceFormat.format(value);
    row.classList.remove("winner");
    row.querySelector(".winner-label").hidden = true;
  });

  document.querySelectorAll(".result-unit").forEach((label) => {
    label.textContent = unitLabel;
  });
  document.querySelector("#report-title").textContent = showingCost
    ? "Custo por quilômetro"
    : "Distância por real";
  document.querySelector("#report-note").textContent = showingCost
    ? "O menor custo por quilômetro é a opção mais econômica para cada percurso."
    : "A maior distância por real é a opção mais econômica para cada percurso.";
  document.querySelector(".report-icon").textContent = showingCost ? "R$" : "km";
  document.querySelectorAll("[data-result-unit]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.resultUnit === unit));
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