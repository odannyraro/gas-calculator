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

A API ficará disponível em `http://127.0.0.1:5000`. Envie um `POST` para `/api/calculate` com JSON:

```json
{
  "distance_km": 300,
  "efficiency_km_per_liter": 12,
  "price_per_liter": 5.99
}
```

Para abrir a interface sem iniciar o backend, abra `docs/index.html` no navegador.

## Testes

```bash
pytest
```

## GitHub Pages

No repositório, habilite Pages em **Settings > Pages** e selecione **GitHub Actions** como origem. O workflow publica a pasta `docs/` em pushes para `main`.