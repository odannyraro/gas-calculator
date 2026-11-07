import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";

import { calculateCost, calculateWinners, initializeCalculator } from "../docs/app.js";

const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const validValues = [10.5, 13, 7.2, 8.5, 5.89, 3.99];

function createCalculator() {
  const dom = new JSDOM(html);
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
    dom.window.document.querySelector(`[name="${name}"]`).value = values[index];
  });
}

function submitForm(dom) {
  const event = new dom.window.Event("submit", { bubbles: true, cancelable: true });
  dom.window.document.querySelector("#comparison-form").dispatchEvent(event);
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