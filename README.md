# Jornal Bem Baiano

O **Jornal Bem Baiano** é um agregador institucional projetado para centralizar e exibir as notícias oficiais da Reitoria e de todos os campi do Instituto Federal Baiano.

## 🚀 Arquitetura e Tecnologias
O projeto é construído focado em máxima performance e pureza de código (Vanilla), eliminando frameworks pesados e dependências externas complexas.

*   **Frontend**: HTML5 Semântico, CSS3 Moderno (CSS Variables, Grid, Flexbox) e JavaScript ES6+.
*   **Design System**: Construído rigorosamente sobre o Manual da Marca do IF Baiano (2015), adotando o tom verde primário (`#2F9E41`) e vermelho secundário (`#CD191E`).
*   **Acessibilidade (A11y)**: Menu de controle para alteração de tamanho de fonte e alternância para o modo Alto Contraste.
*   **Segurança e Privacidade**: Banner integrado para consentimento de cookies em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD).
*   **Backend / Automação**: Um script em Python (`coletor_bem_baiano.py`) encarregado da varredura via API REST do WordPress para construir o JSON/CSV consolidado, executado em nuvem a cada 12 horas através do **GitHub Actions**.

## 📁 Estrutura do Projeto
- `index.html`: Página principal com o *grid* de notícias.
- `app.js`: Motor de leitura assíncrona do CSV gerado e injeção dinâmica no DOM.
- `style.css`: Folhas de estilo da aplicação e controles do Design System e A11y.
- `404.html`: Tratamento de rotas cegas.
- `coletor_bem_baiano.py`: Motor de varredura Python (Scraper de APIs).
- `.github/workflows/atualizar_noticias.yml`: Automação da execução em nuvem.

---

## 📜 Log de Atualizações (Changelog)

### [23/07/2026] - Lançamento da Arquitetura Base 
*   **Adicionado**: Implementação do script robô coletor de dados (`coletor_bem_baiano.py`) integrado ao endpoint `_embed` da API do WordPress Institucional para capturar miniaturas, datas, resumos e links dos 15 campi do IF Baiano (6.585 matérias).
*   **Adicionado**: Construção da interface *Vanilla* com `index.html`, `style.css` (Cores IF Baiano 2015 implementadas), `404.html` e motor lógico de carregamento assíncrono via `app.js`.
*   **Adicionado**: Recursos nativos de acessibilidade (A11y) e política de cookies (LGPD).
*   **Adicionado**: Criação do arquivo de automação `.github/workflows/atualizar_noticias.yml` projetado para rodar a cada 12h garantindo a atualização do banco de dados de notícias sem intervenção manual.
