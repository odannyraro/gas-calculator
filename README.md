# Calculadora de combustível

Comparador estático de gasolina e etanol. O cálculo acontece no navegador, sem API ou backend, então pode ser publicado diretamente no GitHub Pages.

## Estrutura

- `docs/`: calculadora estática publicada no GitHub Pages; `app.js` contém os cálculos e a interface.
- `tests/test_app.js`: testes unitários de cálculo e testes da integração com o formulário.
- `.github/workflows/tests.yml`: executa os testes em Node.js 20, 22 e 24 no Ubuntu, Windows e macOS.
- `.github/workflows/pages.yml`: publica `docs/` no GitHub Pages quando há mudanças na branch `main`.

## Executar localmente

```bash
npm ci
npm run dev
```

O site estará disponível em `http://localhost:8000`.

## Testes

```bash
npm test
```

Os testes usam o runner nativo do Node.js e JSDOM para validar as funções de cálculo, os erros de entrada e a atualização do relatório.

## GitHub Pages

No repositório, habilite Pages em **Settings > Pages** e selecione **GitHub Actions** como origem. O workflow publica a pasta `docs/` em pushes para `main`.