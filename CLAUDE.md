# Assistente Pessoal com IA (por voz e texto)

## Objetivo
App pessoal, usado por UMA pessoa, em celular e computador. O usuário conversa (por voz ou texto) e o assistente entende, guarda a informação no lugar certo e depois responde perguntas sobre ela. Também responde perguntas gerais (mundo, lojas, dúvidas do dia a dia).

Exemplos do que o usuário vai falar:
- "Recebi 920, é meu pagamento do dia 20" -> registra uma receita.
- "Gastei 35 no mercado" -> registra um gasto e o saldo diminui.
- "Tenho médico dia 5 às 14h" -> cria um compromisso na categoria saúde.
- "Quanto ainda tenho?" / "Quando é meu médico?" -> consulta o banco e responde.
- "Quando foi minha última consulta com o cardiologista?" -> consulta o histórico.

## Stack (decidida, não trocar sem perguntar)
- **Next.js (App Router) + TypeScript + Tailwind**, configurado como **PWA** (instalável na tela inicial do celular, funciona no PC com o mesmo código).
- **Supabase** (Postgres + Auth + Row Level Security) como banco. Plano gratuito.
- **API do Claude (Anthropic)** chamada SOMENTE pelo servidor (rotas em `app/api/...`), usando **tool use**. A chave nunca vai para o navegador.
- **Voz de entrada:** Web Speech API do navegador (`SpeechRecognition`, idioma `pt-BR`). Botão de microfone no chat.
- **Voz de saída:** `speechSynthesis` do navegador (`pt-BR`), com opção de ligar/desligar. Voz melhor (ex: ElevenLabs) fica para o futuro, opcional.
- **Hospedagem:** Vercel (plano gratuito).

## Regras de arquitetura (importantes)
1. **A IA nunca faz conta.** Saldo, totais e somas são calculados por código/SQL. A IA só interpreta a fala e chama as ferramentas.
2. **Valores em centavos (inteiro)** no banco, para evitar erro de arredondamento. Formatar como R$ só na tela.
3. **Nada é apagado sem o usuário mandar.** Compromissos mudam de status; gastos e receitas nunca são apagados automaticamente.
4. **Confirmar antes de ações destrutivas** (excluir qualquer registro): o assistente pergunta e só executa após o "sim".
5. **Dados só do usuário:** RLS ativado em todas as tabelas (`user_id = auth.uid()`). Login por e-mail via Supabase Auth.
6. **Modelo configurável por variável de ambiente** (`CLAUDE_MODEL`), para poder usar um modelo mais barato nas tarefas simples e trocar sem mexer no código.
7. **Fuso horário:** America/Sao_Paulo. Sempre enviar à IA a data e hora atuais no prompt de sistema, para ela entender "amanhã", "dia 5", "semana que vem".
8. Todas as respostas do assistente e toda a interface em **português do Brasil**.

## Banco de dados (versão inicial)
Todas as tabelas têm `id`, `user_id`, `created_at`.

- `transactions`: `type` ('income' | 'expense'), `amount_cents`, `category`, `description`, `date`
- `appointments`: `title`, `category` ('saude' | 'pessoal' | 'trabalho' | 'outros'), `starts_at`, `status` ('pending' | 'done' | 'archived'), `notes`
- `notes`: `title`, `content`, `category`
- `messages` (histórico do chat): `role`, `content`

Saldo = soma das receitas - soma dos gastos (calculado por query, nunca digitado pela IA).

## Ferramentas (tools) que a IA pode chamar
- `registrar_receita(valor, descricao, data?, categoria?)`
- `registrar_gasto(valor, descricao, data?, categoria?)`
- `consultar_financas(periodo?, categoria?)` -> devolve saldo, total de receitas, total de gastos e lista
- `criar_compromisso(titulo, data_hora, categoria, notas?)`
- `listar_compromissos(periodo?, status?, categoria?, busca?)`
- `atualizar_compromisso(id, status?, notas?)`
- `excluir_registro(tabela, id)` -> só depois de confirmação explícita do usuário
- `criar_nota(titulo, conteudo, categoria?)` e `buscar_notas(busca)`

O servidor executa a ferramenta no Supabase, devolve o resultado para a IA, e a IA responde ao usuário em linguagem natural. Fazer o loop de tool use até a IA terminar.

## Regra de arquivamento de compromissos
- Compromissos comuns: após o dia passar, viram `archived` sozinhos (sem perguntar).
- Categoria **saúde**: após o dia passar, o assistente pergunta ao abrir o app: "Sua consulta de ontem já passou. Quer guardar no histórico, apagar ou anotar como foi?"
- Nunca apagar de verdade sem o usuário mandar.
- Compromissos arquivados continuam consultáveis pelo chat e numa aba "Histórico".

## Telas
1. **Chat** (tela principal): histórico, campo de texto, botão de microfone, botão de voz ligada/desligada.
2. **Finanças:** saldo atual, receitas e gastos do mês, lista de lançamentos, filtro por categoria e mês.
3. **Agenda:** próximos compromissos (pendentes), separados por categoria; aba Histórico.
4. **Notas:** lista e busca.

Interface simples, bonita, mobile-first (o uso principal é no celular), com modo escuro.

## Variáveis de ambiente
```
ANTHROPIC_API_KEY=
CLAUDE_MODEL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # só no servidor, nunca expor
```
Nunca commitar o `.env.local`. Manter um `.env.example` sem valores.

## Fases de desenvolvimento
1. **MVP:** projeto Next.js + PWA, login Supabase, tabelas com RLS, chat por texto com tool use, abas Finanças e Agenda.
2. **Voz de entrada** (microfone no chat).
3. **Voz de saída** (assistente fala a resposta, com liga/desliga).
4. **Notas** e a regra de arquivamento com pergunta para compromissos de saúde.
5. **Perguntas gerais com informação atual** (busca na web via ferramenta de busca da API).
6. **Lembretes por notificação** (ex: "amanhã você tem médico").
7. Novas categorias (lojas, metas, etc.) conforme a necessidade do usuário.

## Como trabalhar neste projeto
- Fazer **uma fase por vez** e parar para o usuário testar antes de seguir.
- Explicar em português simples o que foi feito e como rodar/testar.
- Antes de instalar dependências grandes ou mudar a stack, perguntar.
- O usuário não é desenvolvedor profissional: dar os passos exatos (comandos, onde clicar no Supabase/Vercel) quando precisar de algo manual.
- O computador do usuário é Windows e modesto: evitar ferramentas pesadas e conferir a versão do Node com `node -v` antes de escolher versões de pacotes.
- Escrever o SQL das tabelas em um arquivo `supabase/schema.sql` para o usuário colar no SQL Editor do Supabase.
