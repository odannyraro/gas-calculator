const form = document.querySelector("#comparison-form");
const result = document.querySelector("#result");
const emptyReport = document.querySelector("#report-empty");
const errorMessage = document.querySelector("#form-error");
const currencyFormat = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const reportRows = [
  { id: "gas-city-result", value: "cost_per_km_gas_city" },
  { id: "ethanol-city-result", value: "cost_per_km_alcool_city" },
  { id: "gas-road-result", value: "cost_per_km_gas_highway" },
  { id: "ethanol-road-result", value: "cost_per_km_alcool_highway" },
];

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;

  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    const response = await fetch(window.GAS_CALCULATOR_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Não foi possível calcular os custos.");
    }

    showResults(data);
  } catch (error) {
    result.hidden = true;
    emptyReport.hidden = false;
    errorMessage.textContent = error instanceof TypeError
      ? "Não foi possível conectar à API. Confira a URL do backend e tente novamente."
      : error.message;
    errorMessage.hidden = false;
  }
});

function showResults(data) {
  reportRows.forEach(({ id, value }) => {
    const row = document.querySelector(`#${id}`);
    row.querySelector("strong").textContent = currencyFormat.format(data[value]);
    row.classList.remove("winner");
    row.querySelector(".winner-label").hidden = true;
  });

  markWinner(data.winner_city === "Gasolina" ? "gas-city-result" : "ethanol-city-result");
  markWinner(data.winner_highway === "Gasolina" ? "gas-road-result" : "ethanol-road-result");
  emptyReport.hidden = true;
  result.hidden = false;
}

function markWinner(rowId) {
  const row = document.querySelector(`#${rowId}`);
  row.classList.add("winner");
  row.querySelector(".winner-label").hidden = false;
}