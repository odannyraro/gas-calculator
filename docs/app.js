const form = document.querySelector("#trip-form");
const result = document.querySelector("#result");
const errorMessage = document.querySelector("#form-error");
const litersResult = document.querySelector("#liters-result");
const costResult = document.querySelector("#cost-result");
const numberFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const currencyFormat = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

form.addEventListener("submit", (event) => {
  event.preventDefault();
  errorMessage.hidden = true;

  const distance = Number(form.elements.distance.value);
  const efficiency = Number(form.elements.efficiency.value);
  const price = Number(form.elements.price.value);

  if (!Number.isFinite(distance) || !Number.isFinite(efficiency) || !Number.isFinite(price)
      || distance <= 0 || efficiency <= 0 || price < 0) {
    errorMessage.textContent = "Confira os valores: distância e consumo devem ser maiores que zero.";
    errorMessage.hidden = false;
    result.hidden = true;
    return;
  }

  const liters = distance / efficiency;
  const totalCost = liters * price;
  litersResult.textContent = `${numberFormat.format(liters)} L`;
  costResult.textContent = currencyFormat.format(totalCost);
  result.hidden = false;
});