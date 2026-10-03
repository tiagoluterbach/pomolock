# Copilot Instructions

Estas instruções definem como o agente deve trabalhar neste repositório para manter **TDD** e **commits atômicos**.

## Objetivo
- Entregar mudanças pequenas, seguras e verificáveis.
- Escrever testes primeiro sempre que a mudança alterar comportamento.
- Evitar misturar refactor, feature e correção no mesmo commit.

## Regra de Ouro
1. **Red**: escreva/ajuste um teste que falha pelo motivo correto.
2. **Green**: implemente o mínimo para o teste passar.
3. **Refactor**: melhore o código sem alterar comportamento, mantendo testes verdes.

## Política de TDD
- Para toda mudança de comportamento, adicionar teste em `src/__tests__/` antes da implementação.
- Corrigir bug => primeiro criar teste que reproduz o bug.
- Refactor puro => sem mudança de comportamento; testes existentes devem continuar passando.
- Evitar testar detalhes de implementação; priorizar comportamento observável.

## Política de Commits Atômicos
- Um commit = **uma intenção** (feature pequena, bugfix específico, ou refactor isolado).
- Não combinar mudanças não relacionadas no mesmo commit.
- Separar em commits diferentes quando houver:
  - alteração funcional,
  - refatoração estrutural,
  - mudanças de tooling/configuração,
  - formatação em massa.
- Cada commit deve deixar o projeto em estado estável (build/testes relevantes passando).

## Tamanho e Escopo
- Preferir PRs pequenas e incrementais.
- Limite recomendado por commit: até ~200 linhas alteradas (quando possível).
- Se a tarefa for grande, quebrar em etapas com commits encadeados e independentes.

## Mensagens de Commit
Usar Conventional Commits:
- `feat: ...`
- `fix: ...`
- `refactor: ...`
- `test: ...`
- `chore: ...`

Exemplos:
- `test(timer): add failing case for pending session enqueue`
- `fix(sync): enqueue completed focus session on mode transition`
- `refactor(settings): extract account section component`

## Critérios Antes de Commit
- Rodar testes relevantes da área alterada primeiro.
- Depois, rodar validação mais ampla quando aplicável (`pnpm test`, `pnpm lint`).
- Garantir ausência de erros de tipo/build introduzidos pela mudança.
- Atualizar documentação se contrato/comportamento foi alterado.

## Ordem Recomendada de Trabalho
1. Definir cenário e expectativa (teste).
2. Criar teste falhando.
3. Implementar mínimo para passar.
4. Refatorar com segurança.
5. Executar testes/lint.
6. Commit atômico com mensagem clara.

## Restrições para o Agente
- Não fazer commits automáticos sem solicitação explícita do usuário.
- Não editar arquivos fora do escopo da tarefa.
- Não resolver bugs não relacionados na mesma alteração.
- Não remover testes para “fazer passar”.

## Quando não houver teste viável
Se não for viável automatizar teste (ex.: comportamento dependente de OAuth externo/PWA install), o agente deve:
- Explicar por que o teste automatizado não é viável no momento.
- Fornecer checklist de validação manual mínimo.
- Manter o commit ainda assim pequeno e focado.
