import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";

import { calculateCost, calculateTrip, calculateWinners, initializeCalculator } from "../docs/app.js";

const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const validValues = [10.5, 13, 7.2, 8.5, 5.89, 3.99];
const storageKey = "gas-calculator:inputs:v1";

function createCalculator(savedValues = null) {
  const dom = new JSDOM(html, { url: "https://gas-calculator.test/" });
  if (savedValues !== null) dom.window.localStorage.setItem(storageKey, savedValues);
  initializeCalculator(dom.window.document);
  return dom;
}

function fillForm(dom, values = validValues) {
  const names = [
    "km_per_liter_gas_city",
    "km_per_liter_gas_highway",
    "km_per_liter_alcool_city",
    "km_per_liter_alcool_highway",
    "price_per_liter_gas",
    "price_per_liter_alcool",
  ];
  names.forEach((name, index) => {
    const value = values[index];
    const decimalPlaces = index < 4 ? 1 : 2;
    const inputValue = typeof value === "number"
      ? value.toFixed(decimalPlaces).replace(".", ",")
      : value;
    dom.window.document.querySelector(`[name="${name}"]`).value = inputValue;
  });
}

function submitForm(dom) {
  const event = new dom.window.Event("submit", { bubbles: true, cancelable: true });
  dom.window.document.querySelector("#comparison-form").dispatchEvent(event);
}

function fillTripInputs(dom, distance = "320", tankCapacity = "50") {
  const document = dom.window.document;
  document.querySelector('[name="trip_distance_km"]').value = distance;
  document.querySelector('[name="tank_capacity_liters"]').value = tankCapacity;
  document.querySelector('[name="trip_distance_km"]').dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  document.querySelector('[name="tank_capacity_liters"]').dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}

function submitTripForm(dom) {
  const event = new dom.window.Event("submit", { bubbles: true, cancelable: true });
  dom.window.document.querySelector("#trip-form").dispatchEvent(event);
}

test("calculateCost returns the four expected costs per kilometer", () => {
  assert.deepEqual(calculateCost(...validValues), {
    cost_per_km_gas_city: 0.56,
    cost_per_km_gas_highway: 0.45,
    cost_per_km_alcool_city: 0.55,
    cost_per_km_alcool_highway: 0.47,
  });
});

for (const [id, values] of [
  ["zero-city-consumption", [0, 13, 7.2, 8.5, 5.89, 3.99]],
  ["negative-highway-consumption", [10.5, -1, 7.2, 8.5, 5.89, 3.99]],
]) {
  test(`calculateCost rejects non-positive consumption: ${id}`, () => {
    assert.throws(() => calculateCost(...values), RangeError);
  });
}

for (const [id, value] of [
  ["empty", ""],
  ["text", "inválido"],
  ["array", []],
]) {
  test(`calculateCost rejects non-numeric values: ${id}`, () => {
    assert.throws(() => calculateCost(10.5, 13, value, 8.5, 5.89, 3.99), TypeError);
  });
}

test("calculateWinners chooses the lowest cost for each route", () => {
  assert.deepEqual(calculateWinners(0.56, 0.45, 0.55, 0.47), {
    winner_city: "Etanol",
    winner_highway: "Gasolina",
  });
});

test("calculateWinners prefers gasoline when costs are tied", () => {
  assert.deepEqual(calculateWinners(0.5, 0.4, 0.5, 0.4), {
    winner_city: "Gasolina",
    winner_highway: "Gasolina",
  });
});

test("calculateCost rejects negative fuel prices", () => {
  assert.throws(() => calculateCost(10.5, 13, 7.2, 8.5, -1, 3.99), RangeError);
});

test("calculateCost rejects non-finite inputs", () => {
  assert.throws(() => calculateCost(Infinity, 13, 7.2, 8.5, 5.89, 3.99), RangeError);
});

test("calculateTrip returns liters, cost and tank requirements for all fuels and routes", () => {
  const trip = calculateTrip(...validValues, 1200, 50);

  assert.equal(trip.distance_km, 1200);
  assert.equal(trip.tank_capacity_liters, 50);
  assert.equal(trip.scenarios.length, 4);
  const gasCity = trip.scenarios.find(({ fuel, route }) => fuel === "Gasolina" && route === "Cidade");
  assert.equal(gasCity.liters, 1200 / 10.5);
  assert.equal(gasCity.cost, (1200 / 10.5) * 5.89);
  assert.equal(gasCity.tank_equivalents, (1200 / 10.5) / 50);
  assert.equal(gasCity.full_tanks_required, 3);
  assert.equal(gasCity.refuel_stops_if_full, 2);
  assert.equal(gasCity.refuel_stops_if_full, 2);
});

test("calculateTrip accepts zero fuel prices and reports no trip cost", () => {
  const trip = calculateTrip(10, 12, 7, 8, 0, 0, 100, 40);

  assert.equal(trip.scenarios[0].cost, 0);
  assert.equal(trip.scenarios[0].liters, 10);
});

for (const [id, distance, tankCapacity] of [
  ["zero-distance", 0, 50],
  ["negative-distance", -10, 50],
  ["zero-tank-capacity", 320, 0],
  ["invalid-tank-capacity", 320, NaN],
]) {
  test(`calculateTrip rejects ${id}`, () => {
    assert.throws(() => calculateTrip(...validValues, distance, tankCapacity));
  });
}

test("trip button stays disabled until all six comparison and two trip fields are valid", () => {
  const dom = createCalculator();
  const document = dom.window.document;
  const button = document.querySelector("#trip-submit");
  assert.equal(button.getAttribute("aria-disabled"), "true");

  fillForm(dom, validValues.slice(0, 5));
  fillTripInputs(dom);
  assert.equal(button.getAttribute("aria-disabled"), "true");

  fillForm(dom);
  document.querySelector('[name="price_per_liter_alcool"]').dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  assert.equal(button.getAttribute("aria-disabled"), "false");

  document.querySelector('[name="trip_distance_km"]').value = "0";
  document.querySelector('[name="trip_distance_km"]').dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  assert.equal(button.getAttribute("aria-disabled"), "true");
});

test("comparison button stays disabled until all six fields are filled with valid values", () => {
  const dom = createCalculator();
  const document = dom.window.document;
  const button = document.querySelector('#comparison-form button[type="submit"]');
  assert.equal(button.getAttribute("aria-disabled"), "true");

  fillForm(dom, validValues.slice(0, 5));
  document.querySelector('[name="price_per_liter_alcool"]').dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  assert.equal(button.getAttribute("aria-disabled"), "true");

  fillForm(dom);
  document.querySelector('[name="price_per_liter_alcool"]').dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  assert.equal(button.getAttribute("aria-disabled"), "false");

  document.querySelector('[name="km_per_liter_gas_city"]').value = "0";
  document.querySelector('[name="km_per_liter_gas_city"]').dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  assert.equal(button.getAttribute("aria-disabled"), "true");
});

test("cost comparison works without trip inputs and keeps the trip calculator below it", () => {
  const dom = createCalculator();
  fillForm(dom);
  submitForm(dom);

  const document = dom.window.document;
  assert.equal(document.querySelector("#result").hidden, false);
  assert.equal(document.querySelector("#trip-result").hidden, true);
  assert.equal(document.querySelector("#trip-submit").getAttribute("aria-disabled"), "true");
  assert.ok(document.querySelector("#comparison-form").compareDocumentPosition(document.querySelector("#trip-form"))
    & dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
});

test("attempting comparison with incomplete fields shows a muted validation message", () => {
  const dom = createCalculator();
  const document = dom.window.document;

  document.querySelector('#comparison-form button[type="submit"]').click();

  assert.equal(document.querySelector('#comparison-form button[type="submit"]').getAttribute("aria-disabled"), "true");
  assert.equal(document.querySelector("#form-error").hidden, false);
  assert.match(document.querySelector("#form-error").textContent, /seis campos/i);
  assert.equal(document.querySelector("#result").hidden, true);

  fillForm(dom);
  document.querySelector('[name="price_per_liter_alcool"]').dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  assert.equal(document.querySelector("#form-error").hidden, true);
});

test("attempting trip calculation without trip inputs shows guidance below its button", () => {
  const dom = createCalculator();
  const document = dom.window.document;
  fillForm(dom);
  document.querySelector('[name="price_per_liter_alcool"]').dispatchEvent(new dom.window.Event("input", { bubbles: true }));

  document.querySelector("#trip-submit").click();

  assert.equal(document.querySelector("#trip-submit").getAttribute("aria-disabled"), "true");
  assert.equal(document.querySelector("#trip-error").hidden, false);
  assert.match(document.querySelector("#trip-error").textContent, /distância|tanque/i);
  assert.equal(document.querySelector("#trip-result").hidden, true);

  fillTripInputs(dom);
  assert.equal(document.querySelector("#trip-error").hidden, true);
});

test("trip calculation displays original comparison and a four-scenario trip report below it", () => {
  const dom = createCalculator();
  fillForm(dom);
  fillTripInputs(dom, "1200", "50");
  let comparisonActionRanBeforeTrip = false;
  dom.window.document.querySelector("#comparison-form").addEventListener("submit", () => {
    comparisonActionRanBeforeTrip = !dom.window.document.querySelector("#result").hidden;
  });
  submitTripForm(dom);

  const document = dom.window.document;
  const reportColumn = document.querySelector(".report-column");
  assert.equal(document.querySelector("#result").hidden, false);
  assert.equal(document.querySelector("#trip-result").hidden, false);
  assert.equal(document.querySelector("#report-empty").hidden, true);
  assert.equal(document.querySelectorAll("#trip-scenarios .trip-scenario").length, 4);
  assert.equal(document.querySelector("#trip-distance-summary").textContent, "1.200,00 km de percurso · tanque de 50,00 L");
  assert.match(document.querySelector("#trip-scenarios").textContent, /Gasolina · Cidade/);
  assert.match(document.querySelector("#trip-scenarios").textContent, /Etanol · Estrada/);
  assert.match(document.querySelector("#trip-scenarios").textContent, /Paradas para abastecer\*/);
  assert.equal(comparisonActionRanBeforeTrip, true);
  assert.ok(document.querySelector("#result").compareDocumentPosition(document.querySelector("#trip-result"))
    & dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.equal(reportColumn.lastElementChild.id, "trip-result");
});

test("trip calculation reports an error and hides results when an input becomes invalid", () => {
  const dom = createCalculator();
  fillForm(dom);
  fillTripInputs(dom, "320", "50");
  submitTripForm(dom);

  const distanceInput = dom.window.document.querySelector('[name="trip_distance_km"]');
  distanceInput.value = "-1";
  distanceInput.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  submitTripForm(dom);

  assert.equal(dom.window.document.querySelector("#trip-result").hidden, true);
  assert.equal(dom.window.document.querySelector("#trip-error").hidden, false);
  assert.match(dom.window.document.querySelector("#trip-error").textContent, /maiores que zero/i);
});

test("form submission renders costs and highlights each winner", () => {
  const dom = createCalculator();
  fillForm(dom);
  submitForm(dom);

  const document = dom.window.document;
  assert.equal(document.querySelector("#result").hidden, false);
  assert.equal(document.querySelector("#gas-city-result strong").textContent, "R$ 0,56");
  assert.equal(document.querySelector("#ethanol-city-result").classList.contains("winner"), true);
  assert.equal(document.querySelector("#gas-road-result").classList.contains("winner"), true);
  assert.equal(document.querySelector("#form-error").hidden, true);
});

test("typing digits immediately displays the implied decimal places", () => {
  const dom = createCalculator();
  const document = dom.window.document;
  const consumption = document.querySelector('[name="km_per_liter_gas_city"]');
  const price = document.querySelector('[name="price_per_liter_gas"]');
  const explicitDecimal = document.querySelector('[name="km_per_liter_gas_highway"]');

  for (const digit of "105") {
    consumption.value += digit;
    consumption.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  }
  for (const digit of "589") {
    price.value += digit;
    price.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  }
  explicitDecimal.value = "13.0";
  explicitDecimal.dispatchEvent(new dom.window.Event("input", { bubbles: true }));

  assert.equal(consumption.value, "10,5");
  assert.equal(price.value, "5,89");
  assert.equal(explicitDecimal.value, "13,0");
});

test("clicking a populated field places the caret at the end", () => {
  const dom = createCalculator();
  const consumption = dom.window.document.querySelector('[name="km_per_liter_gas_city"]');
  consumption.value = "10,5";
  consumption.setSelectionRange(1, 1);
  consumption.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

  assert.equal(consumption.selectionStart, consumption.value.length);
  assert.equal(consumption.selectionEnd, consumption.value.length);
});

test("form submission calculates correctly from digit-only entries", () => {
  const dom = createCalculator();
  const digitOnlyValues = ["105", "130", "72", "85", "589", "399"];
  fillForm(dom, digitOnlyValues);
  submitForm(dom);

  const document = dom.window.document;
  assert.deepEqual(
    [...document.querySelectorAll("#comparison-form input")].map((input) => input.value),
    ["10,5", "7,2", "13,0", "8,5", "5,89", "3,99"],
  );
  assert.equal(document.querySelector("#gas-city-result strong").textContent, "R$ 0,56");
  assert.equal(document.querySelector("#result").hidden, false);
});

test("entered values persist and are restored in a future session", () => {
  const firstSession = createCalculator();
  fillForm(firstSession);
  firstSession.window.document.querySelectorAll("#comparison-form input").forEach((input) => {
    input.dispatchEvent(new firstSession.window.Event("input", { bubbles: true }));
  });
  const savedValues = firstSession.window.localStorage.getItem(storageKey);
  assert.deepEqual(JSON.parse(savedValues), {
    km_per_liter_gas_city: "10,5",
    km_per_liter_gas_highway: "13,0",
    km_per_liter_alcool_city: "7,2",
    km_per_liter_alcool_highway: "8,5",
  });

  const nextSession = createCalculator(savedValues);
  assert.deepEqual(
    [...nextSession.window.document.querySelectorAll("#comparison-form input")].map((input) => input.value),
    ["10,5", "7,2", "13,0", "8,5", "", ""],
  );
});

test("previously saved fuel prices are removed when a session is restored", () => {
  const legacyValues = JSON.stringify({
    km_per_liter_gas_city: "10,5",
    km_per_liter_gas_highway: "13,0",
    km_per_liter_alcool_city: "7,2",
    km_per_liter_alcool_highway: "8,5",
    price_per_liter_gas: "5,89",
    price_per_liter_alcool: "3,99",
  });
  const dom = createCalculator(legacyValues);
  const form = dom.window.document.querySelector("#comparison-form");

  assert.equal(form.elements.namedItem("price_per_liter_gas").value, "");
  assert.equal(form.elements.namedItem("price_per_liter_alcool").value, "");
  assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(storageKey)), {
    km_per_liter_gas_city: "10,5",
    km_per_liter_gas_highway: "13,0",
    km_per_liter_alcool_city: "7,2",
    km_per_liter_alcool_highway: "8,5",
  });
});

test("malformed saved values do not prevent the calculator from initializing", () => {
  const dom = createCalculator("not valid JSON");

  assert.equal(dom.window.document.querySelector("#comparison-form").elements.namedItem("km_per_liter_gas_city").value, "");
});

test("the report switches between cost and distance units without changing winners", () => {
  const dom = createCalculator();
  fillForm(dom);
  submitForm(dom);

  const document = dom.window.document;
  const costButton = document.querySelector('[data-result-unit="cost"]');
  const distanceButton = document.querySelector('[data-result-unit="distance"]');
  assert.equal(costButton.getAttribute("aria-pressed"), "true");
  assert.equal(document.querySelector("#gas-city-result strong").textContent, "R$ 0,56");

  distanceButton.click();
  assert.equal(document.querySelector("#report-title").textContent, "Distância por real");
  assert.equal(document.querySelector("#gas-city-result strong").textContent, "1,78");
  assert.equal(document.querySelector("#ethanol-city-result strong").textContent, "1,80");
  assert.equal(document.querySelector("#city-title + .result-unit").textContent, "km/R$");
  assert.equal(document.querySelector("#gas-road-result strong").textContent, "2,21");
  assert.equal(document.querySelector("#ethanol-road-result strong").textContent, "2,13");
  assert.equal(document.querySelector("#road-title + .result-unit").textContent, "km/R$");
  assert.match(document.querySelector("#report-note").textContent, /maior distância por real/i);
  assert.equal(distanceButton.getAttribute("aria-pressed"), "true");
  assert.equal(costButton.getAttribute("aria-pressed"), "false");
  assert.equal(document.querySelector("#ethanol-city-result").classList.contains("winner"), true);
  assert.equal(document.querySelector("#gas-road-result").classList.contains("winner"), true);

  costButton.click();
  assert.equal(document.querySelector("#report-title").textContent, "Custo por quilômetro");
  assert.equal(document.querySelector("#gas-city-result strong").textContent, "R$ 0,56");
  assert.equal(document.querySelector("#city-title + .result-unit").textContent, "R$/km");
  assert.equal(document.querySelector("#road-title + .result-unit").textContent, "R$/km");
  assert.match(document.querySelector("#report-note").textContent, /menor custo por quilômetro/i);
  assert.equal(costButton.getAttribute("aria-pressed"), "true");
  assert.equal(distanceButton.getAttribute("aria-pressed"), "false");
});

test("the distance view remains available when a fuel is free", () => {
  const dom = createCalculator();
  const values = [...validValues];
  values[4] = "0";
  fillForm(dom, values);
  submitForm(dom);
  dom.window.document.querySelector('[data-result-unit="distance"]').click();

  assert.equal(dom.window.document.querySelector("#gas-city-result strong").textContent, "∞");
});

for (const [id, index, value] of [
  ["zero-consumption", 0, "0"],
  ["negative-price", 4, "-1"],
  ["empty-value", 0, ""],
  ["invalid-number", 2, "inválido"],
]) {
  test(`form submission rejects ${id}`, () => {
    const dom = createCalculator();
    const values = [...validValues];
    values[index] = value;
    fillForm(dom, values);
    submitForm(dom);

    const document = dom.window.document;
    assert.equal(document.querySelector("#result").hidden, true);
    assert.equal(document.querySelector("#report-empty").hidden, false);
    assert.equal(document.querySelector("#form-error").hidden, false);
    assert.match(document.querySelector("#form-error").textContent, /valores|consumo|preço/i);
  });
}

test("form submission accepts a zero fuel price", () => {
  const dom = createCalculator();
  const values = [...validValues];
  values[4] = "0";
  fillForm(dom, values);
  submitForm(dom);

  assert.equal(dom.window.document.querySelector("#result").hidden, false);
  assert.equal(dom.window.document.querySelector("#gas-city-result strong").textContent, "R$ 0,00");
});

test("invalid resubmission hides a previously displayed report", () => {
  const dom = createCalculator();
  fillForm(dom);
  submitForm(dom);
  fillForm(dom, ["", ...validValues.slice(1)]);
  submitForm(dom);

  assert.equal(dom.window.document.querySelector("#result").hidden, true);
  assert.equal(dom.window.document.querySelector("#form-error").hidden, false);
});