# Calculadora de combustível

Projeto com uma interface estática para GitHub Pages e uma API Python independente.

## Estrutura

- `docs/`: calculadora estática publicada no GitHub Pages.
- `backend/`: API Flask para calcular consumo e custo.
- `tests/`: testes automatizados da API.
- `.github/workflows/tests.yml`: executa os testes em Python 3.11 e 3.12 no Ubuntu, Windows e macOS.
- `.github/workflows/pages.yml`: publica `docs/` no GitHub Pages quando há mudanças na branch `main`.

O GitHub Pages serve arquivos estáticos e não executa Python. Por isso, a calculadora da página faz o cálculo no navegador. O backend é uma API separada e precisa ser hospedado em um serviço que execute Python caso você queira consumi-lo pela interface.

## Executar localmente

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python -m backend.app
```

A API ficará disponível em `http://127.0.0.1:5000`. Em outro terminal, inicie um servidor estático para a interface:

```bash
python -m http.server 8000 --directory docs
```

Abra `http://127.0.0.1:8000`. O formulário envia os dados ao backend em `http://127.0.0.1:5000/api/calculate`, com este JSON:

```json
{
  "km_per_liter_gas_city": 10.5,
  "km_per_liter_gas_highway": 13,
  "km_per_liter_alcool_city": 7.2,
  "km_per_liter_alcool_highway": 8.5,
  "price_per_liter_gas": 5.89,
  "price_per_liter_alcool": 3.99
}
```

A interface envia os valores para a URL definida em `docs/config.js`. Localmente, ela usa `http://127.0.0.1:5000/api/calculate`. Para usar a interface publicada no GitHub Pages, hospede o backend Flask em um serviço com HTTPS e atualize essa URL para o endereço público da API.

## Testes

```bash
pytest
```

## GitHub Pages

No repositório, habilite Pages em **Settings > Pages** e selecione **GitHub Actions** como origem. O workflow publica a pasta `docs/` em pushes para `main`.