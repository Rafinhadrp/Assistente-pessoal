# Situação do projeto — Assistente Pessoal

_Atualizado em 30/10/2026 (noite)._

Este arquivo responde três perguntas: **o que já está pronto**, **o que está feito mas ainda não foi publicado** e **o que falta fazer**.

---

## 1. Já está no ar (publicado na Vercel)

| Item | Situação |
|---|---|
| **Fase 1 – MVP** | ✅ Login por e-mail, banco no Supabase com segurança (cada um só vê os próprios dados), chat por texto com a IA, telas de Finanças e Agenda |
| **Fase 2 – Voz de entrada** | ✅ Microfone no chat em modo ditado (como no app do Claude): você fala, confere o texto e toca em enviar |
| Proteção contra duplicados | ✅ A IA confere o que já existe antes de criar, e o código bloqueia compromisso ou gasto repetido |
| Só você usa o app | ✅ Apenas o e-mail em `EMAILS_PERMITIDOS` cria conta e conversa com a IA |
| Atualizar o app | ✅ Puxar a tela para baixo, botão ↻ e aviso "Nova versão disponível" |
| Mascote `<R/>` | ✅ Aparece ao lado das respostas, e a IA escolhe a carinha de cada resposta |
| Logo do Assistente | ✅ Mascote + balão de conversa no login e no ícone da tela de início |
| **Transcrição com Deepgram** | ✅ Código pronto: grava, mostra a onda da voz e transcreve ao tocar no ■ (precisa da chave `DEEPGRAM_API_KEY`) |
| **Redesign premium** | ✅ Azul-marinho com vidro, navegação flutuante, mascote animado com o pacote novo (acenando, parado, pensando, comemorando, erro, desconfiado, chamando), painel do mascote em Finanças e Agenda, modo claro conferido |
| **Várias conversas** | ✅ Gaveta de conversas (☰), nova conversa, trocar e excluir (arrastando ou pela lixeira, com confirmação). Excluir conversa **não** apaga nada de Finanças nem da Agenda |
| **Perfil completo** | ✅ Bolinha com a inicial ou foto na barra de baixo (no computador, com o nome). Abas Perfil / Editar / Conta: foto, nome, nome completo, nascimento, telefone, cidade/estado, profissão, sobre mim, trocar senha e **sair da conta** (com confirmação, longe dos outros botões) |
| **Vidro estilo Apple** | ✅ Tema único azul-marinho (igual no celular e no computador), vidro bem translúcido com reflexo de luz, barra de abas em cápsula, botões arredondados |
| **Fase 5 – Busca na internet** | ✅ A IA pesquisa quando precisa de informação atual (clima, notícias, lojas, preços). Embaixo de cada resposta: **🌐 pesquisou na internet** (teve custo extra; toque para ver as fontes) ou **✓ sem busca** (sem custo extra). No máximo 3 buscas por resposta |

---

## 2. Publicado agora: precisa da atualização do banco

Já foi enviado para o GitHub/Vercel. **Para funcionar, rode o `supabase/schema.sql` de novo** (veja a seção 4). Até lá, as telas mostram o aviso "Falta atualizar o banco de dados" e a IA avisa quando não conseguir salvar algo.

| Item | Como funciona | Testado |
|---|---|---|
| **Editar** lançamentos e compromissos | Toque no item: abre uma janela para editar. Depois aparece "✎ editado por você" | ✅ |
| **Arrastar para apagar** | Arraste o item para a esquerda: ele pede confirmação e manda para a lixeira. Aparece "Desfazer" por 5 segundos | ✅ |
| **Lixeira de 30 dias** | Botão de lixeira no topo de Finanças e Agenda. Dá para restaurar, apagar de vez ou esvaziar. Depois de 30 dias o item é apagado sozinho. O que está na lixeira não conta no saldo e a IA não vê | ✅ (o SQL foi testado num Postgres de verdade) |
| **Visual novo: vidro suave** (glassmorphism) | Fundo com cores difusas que se mexem devagar, superfícies de vidro discretas, grão leve, nova fonte, ícones e navegação | ✅ Modo escuro conferido · ⏳ falta conferir o modo claro |
| Telas refeitas | Chat (barra de escrever flutuante, saudação "Bom dia/Boa tarde"), Finanças (saldo, mês com setinhas, categorias em chips, lista por dia), Agenda, Login | ✅ |

**Falta nesta parte:**
- [ ] Você rodar o `schema.sql` no Supabase.
- [ ] Conferir as telas no **modo claro** e a janela de editar compromisso.

---

## 3. O que falta fazer (próximas etapas)

### Aguardando você
- **Chave do Deepgram** (veja a seção 4). O código já está pronto; sem a chave, o microfone usa o ditado do próprio celular.
- **Ramo `main` no GitHub** (opcional): hoje a Vercel publica a partir do ramo `claude/new-session-pvrayw`. Funciona normalmente.

### Ideias para depois
- Seletora de semana na Agenda (D S T Q Q S S), como na prévia de design. Seria uma função nova (filtrar por dia).

### Fases que faltam (do plano original)
- [ ] **Fase 3 – Voz de saída:** o assistente fala a resposta em voz alta, com botão de liga/desliga.
- [ ] **Fase 4 – Notas** (tela de notas com busca) e a **regra de arquivamento** (compromissos passados arquivam sozinhos; os de saúde perguntam "quer guardar no histórico ou anotar como foi?").
- [ ] **Fase 6 – Lembretes por notificação** ("amanhã você tem médico").
- [ ] **Fase 7 – Novas categorias** (lojas, metas etc.) conforme você precisar.

---

## 4. Tarefas suas (manuais)

- [ ] **Rodar o `supabase/schema.sql`** no Supabase: abra **SQL Editor**, clique em **New query**, cole o arquivo inteiro e clique em **Run**. Pode rodar quantas vezes quiser, porque ele não apaga dados. Isso cria:
  - a coluna do histórico de ações (que evita duplicados);
  - a lixeira;
  - a marcação "editado por você";
  - a coluna que guarda as buscas e as fontes de cada resposta (o selo 🌐 / ✓ continua aparecendo depois que você recarrega).
- [ ] **(Opcional) Colocar sua cidade** na Vercel: **Settings → Environment Variables**, variável `CIDADE` (ex: `Campinas`), e depois **Redeploy**. Assim "como está o clima hoje?" já sabe onde você está.
- [ ] **Se nunca aparecer 🌐:** a busca na internet pode estar desligada na sua conta da Anthropic. Em console.anthropic.com, procure nas configurações da organização a opção de **web search** e ligue. Enquanto estiver desligada, o app continua funcionando normalmente, só que sem buscar.
- [ ] **Rodar o `supabase/atualizacao.sql` de novo** (SQL Editor → New query → colar → Run). Ele cria as conversas (suas mensagens antigas viram a "Primeira conversa") e o perfil. Sem isso o chat funciona como antes, mas sem a lista de conversas e sem salvar o perfil.
- [ ] **Ligar o Deepgram:** crie conta em deepgram.com, gere uma **API Key** e coloque na Vercel em **Settings → Environment Variables** como `DEEPGRAM_API_KEY`. Depois faça **Redeploy**. Teste o microfone: deve aparecer a onda da voz e "Gravando · 0:03".
- [ ] **Desligar novos cadastros** no Supabase depois de criar sua conta: **Authentication → Sign In / Providers → "Allow new users to sign up"** desligado.
- [ ] **Testar o microfone no seu celular** várias vezes seguidas, sem recarregar. Se falhar, me diga o modelo do celular e se usa o app instalado ou o navegador.

---

## 5. Pontos de atenção conhecidos

- **iPhone:** em algumas versões, o microfone não funciona dentro do app instalado, só no Safari.
- **Microfone pedindo permissão toda vez:** escolha "Permitir ao usar o app" em vez de "Só desta vez".
- **Excluir pelo chat:** a IA ainda não apaga nada. Para apagar, use o gesto de arrastar nas telas.

---

## 6. Onde está cada coisa

```
app/(app)/page.tsx           Chat (tela principal)
app/(app)/financas/          Finanças
app/(app)/agenda/            Agenda (Próximos / Histórico)
app/(app)/lixeira/           Lixeira (30 dias)
app/(app)/acoes.ts           Editar, lixeira, restaurar, listar/excluir conversas
app/(app)/perfil/            Perfil (foto, dados, senha, sair)
components/ListaConversas.tsx Gaveta de conversas
app/api/chat/route.ts        Conversa com a IA (ferramentas, mascote, histórico de ações)
lib/ferramentas.ts           O que a IA consegue fazer no banco
components/                  Peças das telas (chat, listas, mascote, logo, vidro)
supabase/schema.sql          Banco de dados (rodar de novo a cada atualização)
docs/PUBLICAR.md             Como publicar e instalar no celular
public/mascote/              Imagens do mascote <R/> (svg/png originais + sprites/ animados do pacote novo)
components/MascoteAnimado.tsx Animações do mascote (tiras de quadros)
app/api/transcrever/         Transcrição com Deepgram (a chave fica só no servidor)
```
