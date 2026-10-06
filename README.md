<div align="center">

<img src="public/icon.svg" alt="PomoLock" width="88" />

# PomoLock

**Um timer Pomodoro que respeita o seu foco e mostra a sua constância.**

[**Abrir o app →**](https://pomolock.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js_16-000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?logo=pwa&logoColor=white)

<br />

<img src="docs/screenshots/timer.png" alt="Tela do timer" height="420" />
&nbsp;&nbsp;
<img src="docs/screenshots/stats.png" alt="Estatísticas com o calendário do mês e a grade dos últimos 12 meses" height="420" />

</div>

---

## A ideia

Eu queria um Pomodoro simples que mostrasse a minha constância como um habit tracker, no estilo do
[YeolPumTa (열품타)](https://play.google.com/store/apps/details?id=com.pallo.passiontimerscoped), e que
funcionasse igual no computador de casa e no da faculdade. Não achei nada assim, então construí o meu.

## O que ele faz

### ⏱️ Timer
- Foco, pausa curta e pausa longa com durações configuráveis, e pausa longa a cada N Pomodoros.
- Início automático das pausas e dos Pomodoros, se você quiser.
- Atalho de teclado: <kbd>Espaço</kbd> inicia e pausa.
- Continua contando certo com a aba em segundo plano, a página recarregada ou o computador em suspensão.

### 🧠 Hyperfocus
Quando o Pomodoro acaba e você está rendendo, o timer não te interrompe: o tempo extra continua contando até
você decidir fazer a pausa. Se você esquecer o timer ligado, depois de **1h30 sem interação** ele pergunta se
você ainda está aí e, sem resposta, pausa sozinho, para não registrar horas que você não estudou.

### 📊 Estatísticas
- Calendário do mês com as horas estudadas em cada dia.
- Grade dos últimos 12 meses no estilo do GitHub.
- Sequência de dias seguidos estudando.

### ☁️ Sincronização
- Login com Google opcional. Sem login, tudo fica salvo no navegador.
- Com login, configurações e sessões ficam na nuvem e aparecem em qualquer dispositivo.
- Funciona offline e pode ser instalado como app (PWA). O que você estudar offline é enviado quando a conexão
  volta.

### 🎨 Personalização
Cores de cada modo, som e volume do alarme, tempo no título da aba e exportação dos dados em JSON.

## Como o tempo é contado

A precisão das estatísticas é o centro do app, então estas são as regras:

| Situação | O que é registrado |
|---|---|
| Pomodoro terminado | A duração completa |
| Pular, resetar ou trocar de modo no meio | O tempo estudado até ali, se for 1 minuto ou mais |
| Pomodoro + hyperfocus | As duas partes somadas |
| Pausas | Nada: o tempo pausado não conta |
| Hyperfocus esquecido | Só o tempo até o aviso de inatividade |
| Pausas curta e longa | Não contam como estudo |

Os detalhes técnicos estão em [`docs/timer-clock.md`](./docs/timer-clock.md).

## Tecnologias

| | |
|---|---|
| **Framework** | Next.js 16 (App Router) e React 19 |
| **Linguagem** | TypeScript |
| **Interface** | Tailwind CSS 4, shadcn/ui e Lucide |
| **Estado** | Zustand, salvo no localStorage |
| **Backend** | Supabase: login com Google e PostgreSQL com Row Level Security |
| **Testes** | Vitest e Testing Library |
| **Deploy** | Vercel |

## Rodando localmente

Você precisa de Node.js 20+, pnpm e um projeto no [Supabase](https://supabase.com) (o plano gratuito basta).

```bash
git clone https://github.com/tiagoluterbach/pomolock.git
cd pomolock
pnpm install
cp .env.example .env.local
pnpm dev
```

Depois, configure o Supabase:

1. Copie a **URL** e a **chave anon** do projeto (Settings → API) para o `.env.local`.
2. Rode o [`supabase/migration.sql`](./supabase/migration.sql) no SQL Editor para criar as tabelas.
3. Ative o Google em Authentication → Providers, com credenciais OAuth do Google Cloud.

O app abre em `http://localhost:3000`.

<details>
<summary><b>Outros comandos</b></summary>

| Comando | O que faz |
|---|---|
| `pnpm build` | Build de produção |
| `pnpm lint` | ESLint |
| `pnpm test` | Testes em modo watch |
| `pnpm test:run` | Roda os testes uma vez |

</details>

<details>
<summary><b>Estrutura do projeto</b></summary>

```
src/
├── app/           páginas: timer, estatísticas, configurações e login
├── components/    timer, estatísticas, configurações e componentes de interface
├── hooks/         usuário, timer e sessões
├── lib/           sincronização, estatísticas, exportação e utilitários
├── stores/        estado global do timer
└── types/         tipos e configurações padrão
supabase/          tabelas e políticas de acesso
public/            ícones, sons, service worker e worker do timer
docs/              notas técnicas
```

</details>

## Sobre

Desenvolvido por **Tiago Luterbach**, estudante de Ciência da Computação na UFF, com IA como par de
programação na arquitetura, na implementação e na revisão de código.

Uso pessoal e educacional. Fique à vontade para se inspirar.

<sub>🇺🇸 [Read in English](./README.en.md)</sub>
