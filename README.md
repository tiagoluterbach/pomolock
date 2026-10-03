# PomoLock

Timer Pomodoro com modo hyperfocus, heatmap de estudos, roadmap de Ciência de Dados e sincronização entre dispositivos.

**[pomolock.vercel.app](https://pomolock.vercel.app)** · [English version](./README.en.md)

## Por que existe

Eu queria um Pomodoro simples que mostrasse a minha constância como um habit tracker, no estilo do
[YeolPumTa (열품타)](https://play.google.com/store/apps/details?id=com.pallo.passiontimerscoped), e que
funcionasse igual no computador de casa e no da faculdade. Como não achei nada assim, construí o meu.

## Funcionalidades

- **Timer Pomodoro** com foco, pausa curta e pausa longa configuráveis.
- **Hyperfocus**: quando ativado, o timer não interrompe o foco no fim do Pomodoro. O tempo extra continua
  contando até você decidir fazer a pausa.
- **Estatísticas**: heatmap mensal com as horas estudadas por dia e sequência de dias seguidos.
- **Roadmap**: checklist das áreas de Ciência de Dados (Python, SQL, Estatística, Machine Learning...) com
  progresso por área.
- **Login com Google (opcional)** e sincronização das configurações e sessões na nuvem.
- **Funciona offline e é instalável (PWA)**. Sessões feitas offline são enviadas quando a conexão volta.
- **Alarmes e cores personalizáveis** e exportação dos dados em JSON.

## Tecnologias

| Área | Ferramenta |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript |
| Interface | Tailwind CSS 4, shadcn/ui, Lucide |
| Estado | Zustand com persistência em localStorage |
| Autenticação e banco | Supabase (Google OAuth e PostgreSQL) |
| Testes | Vitest e Testing Library |
| Deploy | Vercel |

## Estrutura

```
src/
  app/            páginas (timer, dashboard, roadmap, settings, login, callback de auth)
  components/
    timer/        tela do timer e controles
    dashboard/    heatmap e navegação por mês
    settings/     uma seção da página de configurações por arquivo
    auth/         ícone do Google e avatar
    ui/           componentes base do shadcn/ui
  data/           conteúdo do roadmap
  hooks/          hooks de React (usuário, timer, sessões)
  lib/            auth, sincronização, estatísticas, exportação, utilitários
  stores/         estado global (timer e progresso do roadmap)
  types/          tipos e configurações padrão
  __tests__/      testes
supabase/         SQL das tabelas e políticas de acesso
public/           ícones, sons, service worker e worker do timer
docs/             notas técnicas (como o relógio do timer funciona)
```

## Rodando localmente

Requisitos: Node.js 20 ou mais recente e pnpm.

```bash
git clone https://github.com/tiagoluterbach/pomolock.git
cd pomolock
pnpm install
cp .env.example .env.local   # preencha com a URL e a chave anon do Supabase
pnpm dev
```

O app abre em `http://localhost:3000`. Sem as variáveis do Supabase o timer não carrega, porque o cliente de
autenticação é criado na inicialização.

### Supabase

1. Crie um projeto no Supabase e copie a URL e a chave `anon` para o `.env.local`.
2. Rode o conteúdo de [`supabase/migration.sql`](./supabase/migration.sql) no SQL Editor.
3. Em Authentication > Providers, ative o Google com as credenciais OAuth do Google Cloud.

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | servidor de desenvolvimento |
| `pnpm build` | build de produção |
| `pnpm lint` | ESLint |
| `pnpm test` | testes em modo watch |
| `pnpm test:run` | testes uma vez |

## Sobre o desenvolvimento

O projeto foi desenvolvido com IA como par de programação, usada para arquitetura, implementação, depuração e
revisão de código.

## Licença

Uso pessoal e educacional. Fique à vontade para se inspirar.

---

Desenvolvido por **Tiago Luterbach**, estudante de Ciência da Computação na UFF.
