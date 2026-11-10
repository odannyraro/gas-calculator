const FIELD_NAMES = [
  "km_per_liter_gas_city",
  "km_per_liter_gas_highway",
  "km_per_liter_alcool_city",
  "km_per_liter_alcool_highway",
  "price_per_liter_gas",
  "price_per_liter_alcool",
];

const STORAGE_KEY = "gas-calculator:inputs:v1";
const PERSISTED_FIELD_NAMES = FIELD_NAMES.slice(0, 4);

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

export function calculateTrip(
  kmPerLiterGasCity,
  kmPerLiterGasHighway,
  kmPerLiterAlcoolCity,
  kmPerLiterAlcoolHighway,
  pricePerLiterGas,
  pricePerLiterAlcool,
  distanceKm,
  tankCapacityLiters,
) {
  const tripValues = [distanceKm, tankCapacityLiters];
  if (tripValues.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    throw new TypeError("Distância e capacidade do tanque devem ser números finitos.");
  }
  if (distanceKm <= 0 || tankCapacityLiters <= 0) {
    throw new RangeError("Distância e capacidade do tanque devem ser maiores que zero.");
  }

  const efficiencies = [
    kmPerLiterGasCity,
    kmPerLiterGasHighway,
    kmPerLiterAlcoolCity,
    kmPerLiterAlcoolHighway,
  ];
  const prices = [pricePerLiterGas, pricePerLiterAlcool];
  const costData = calculateCost(...efficiencies, ...prices);
  const scenarios = [
    { fuel: "Gasolina", route: "Cidade", efficiency: kmPerLiterGasCity, price: pricePerLiterGas },
    { fuel: "Gasolina", route: "Estrada", efficiency: kmPerLiterGasHighway, price: pricePerLiterGas },
    { fuel: "Etanol", route: "Cidade", efficiency: kmPerLiterAlcoolCity, price: pricePerLiterAlcool },
    { fuel: "Etanol", route: "Estrada", efficiency: kmPerLiterAlcoolHighway, price: pricePerLiterAlcool },
  ].map(({ fuel, route, efficiency, price }) => {
    const liters = distanceKm / efficiency;
    return {
      fuel,
      route,
      liters,
      cost: liters * price,
      tank_equivalents: liters / tankCapacityLiters,
      full_tanks_required: Math.ceil(liters / tankCapacityLiters),
      refuel_stops_if_full: Math.max(0, Math.ceil(liters / tankCapacityLiters) - 1),
    };
  });

  if (scenarios.some(({ liters, cost, tank_equivalents }) =>
    !Number.isFinite(liters) || !Number.isFinite(cost) || !Number.isFinite(tank_equivalents))) {
    throw new RangeError("Os valores informados geram uma estimativa fora do intervalo permitido.");
  }

  return { distance_km: distanceKm, tank_capacity_liters: tankCapacityLiters, ...costData, scenarios };
}

export function initializeCalculator(document) {
  const form = document.querySelector("#comparison-form");
  if (!form) return;

  const result = document.querySelector("#result");
  const tripForm = document.querySelector("#trip-form");
  const tripResult = document.querySelector("#trip-result");
  const tripError = document.querySelector("#trip-error");
  const tripSubmit = document.querySelector("#trip-submit");
  const comparisonSubmit = form.querySelector('button[type="submit"]');
  const emptyReport = document.querySelector("#report-empty");
  const errorMessage = document.querySelector("#form-error");
  const unitButtons = document.querySelectorAll("[data-result-unit]");
  const storage = getLocalStorage(document);
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

  restoreFormValues(form, storage);
  saveFormValues(form, storage);
  form.addEventListener("input", () => saveFormValues(form, storage));
  form.addEventListener("input", updateTripAvailability);
  form.addEventListener("input", updateComparisonAvailability);
  tripForm.addEventListener("input", updateTripAvailability);

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

  updateTripAvailability();
  updateComparisonAvailability();

  tripForm.addEventListener("submit", (event) => {
    event.preventDefault();
    tripError.hidden = true;
    form.requestSubmit();

    if (!resultData) {
      tripResult.hidden = true;
      tripError.textContent = errorMessage.textContent || "Confira os dados de consumo e preço antes de calcular a viagem.";
      tripError.hidden = false;
      return;
    }

    try {
      const values = FIELD_NAMES.map((name) => readNumericField(form.elements.namedItem(name), name));
      const distanceKm = readNumericField(tripForm.elements.namedItem("trip_distance_km"), "distância");
      const tankCapacity = readNumericField(tripForm.elements.namedItem("tank_capacity_liters"), "tanque");
      const trip = calculateTrip(...values, distanceKm, tankCapacity);
      renderTripResults(document, trip, currencyFormat, distanceFormat);
      tripResult.hidden = false;
    } catch (error) {
      tripResult.hidden = true;
      tripError.textContent = error.message;
      tripError.hidden = false;
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    errorMessage.hidden = true;

    try {
      Object.entries(DECIMAL_PLACES).forEach(([name, decimalPlaces]) => {
        applyImpliedDecimal(form.elements.namedItem(name), decimalPlaces);
      });
      saveFormValues(form, storage);
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
      tripResult.hidden = true;
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

  function updateTripAvailability() {
    const allValues = [
      ...FIELD_NAMES.map((name) => form.elements.namedItem(name)),
      tripForm.elements.namedItem("trip_distance_km"),
      tripForm.elements.namedItem("tank_capacity_liters"),
    ];
    const isValid = allValues.every((input, index) => {
      const value = Number(input.value.trim().replace(",", "."));
      if (input.value.trim() === "" || !Number.isFinite(value)) return false;
      if (index < 4) return value > 0;
      if (index < 6) return value >= 0;
      return value > 0;
    });
    tripSubmit.setAttribute("aria-disabled", String(!isValid));
    if (isValid) tripError.hidden = true;
  }

  function updateComparisonAvailability() {
    const values = FIELD_NAMES.map((name) => form.elements.namedItem(name));
    const isValid = values.every((input, index) => {
      const rawValue = input.value.trim();
      const value = Number(rawValue.replace(",", "."));
      if (rawValue === "" || !Number.isFinite(value)) return false;
      if (index < 4) return value > 0;
      return value >= 0;
    });
    comparisonSubmit.setAttribute("aria-disabled", String(!isValid));
    if (isValid) errorMessage.hidden = true;
  }
}

function readNumericField(input, label) {
  const rawValue = input.value.trim().replace(",", ".");
  if (rawValue === "") throw new TypeError(`Preencha o campo ${label}.`);
  const value = Number(rawValue);
  if (!Number.isFinite(value)) throw new TypeError(`Informe um valor válido para ${label}.`);
  return value;
}

function renderTripResults(document, trip, currencyFormat, numberFormat) {
  document.querySelector("#trip-distance-summary").textContent =
    `${numberFormat.format(trip.distance_km)} km de percurso · tanque de ${numberFormat.format(trip.tank_capacity_liters)} L`;
  const scenarios = document.querySelector("#trip-scenarios");
  scenarios.replaceChildren();

  trip.scenarios.forEach((scenario) => {
    const article = document.createElement("article");
    article.className = "trip-scenario";

    const heading = document.createElement("h3");
    heading.textContent = `${scenario.fuel} · ${scenario.route}`;

    const values = document.createElement("dl");
    const items = [
      ["Combustível", `${numberFormat.format(scenario.liters)} L`],
      ["Custo estimado", currencyFormat.format(scenario.cost)],
      ["Tanques equivalentes", numberFormat.format(scenario.tank_equivalents)],
      ["Paradas para abastecer*", String(scenario.refuel_stops_if_full)],
    ];

    items.forEach(([label, value]) => {
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      values.append(term, description);
    });

    article.append(heading, values);
    scenarios.append(article);
  });
}

function getLocalStorage(document) {
  try {
    return document.defaultView?.localStorage ?? null;
  } catch {
    return null;
  }
}

function restoreFormValues(form, storage) {
  if (!storage) return;

  try {
    const savedValues = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
    if (!savedValues || typeof savedValues !== "object" || Array.isArray(savedValues)) return;

    PERSISTED_FIELD_NAMES.forEach((name) => {
      if (typeof savedValues[name] !== "string") return;
      const input = form.elements.namedItem(name);
      input.value = savedValues[name];
      applyImpliedDecimal(input, DECIMAL_PLACES[name]);
    });
  } catch {
    // Ignore unavailable storage and malformed saved data.
  }
}

function saveFormValues(form, storage) {
  if (!storage) return;

  try {
    const values = Object.fromEntries(
      PERSISTED_FIELD_NAMES.map((name) => [name, form.elements.namedItem(name).value]),
    );
    storage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // The calculator remains usable when browser storage is unavailable.
  }
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