# Situação do projeto — Assistente Pessoal

_Atualizado em 29/10/2026._

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

### Aguardando sua decisão
- **Transcrição de voz melhor.** Hoje o app usa o reconhecimento do próprio celular (Google no Android, Siri no iPhone). Opções melhores, todas pagas e todas exigindo uma chave nova:
  - **OpenAI (gpt-4o-mini-transcribe / Whisper)** — minha recomendação: ótimo em português e muito barato (centavos por hora de áudio; confirme o preço atual no site da OpenAI).
  - **Google Cloud Speech-to-Text** — bom, mas a configuração é mais trabalhosa.
  - **Deepgram / ElevenLabs** — também bons.
  - Diferença na prática: o texto aparece **depois** que você para de falar, em 1 ou 2 segundos, e não enquanto você fala. Dá para combinar os dois: o texto do celular aparece ao vivo e é trocado pela versão melhor no final.
  - ❓ **Preciso do seu "ok"**, porque isso muda a stack e tem custo.
- **Ramo `main` no GitHub** (opcional): hoje a Vercel publica a partir do ramo `claude/new-session-pvrayw`. Funciona normalmente.

### Fases que faltam (do plano original)
- [ ] **Fase 3 – Voz de saída:** o assistente fala a resposta em voz alta, com botão de liga/desliga.
- [ ] **Fase 4 – Notas** (tela de notas com busca) e a **regra de arquivamento** (compromissos passados arquivam sozinhos; os de saúde perguntam "quer guardar no histórico ou anotar como foi?").
- [ ] **Fase 5 – Perguntas com informação atual** (busca na internet pela IA).
- [ ] **Fase 6 – Lembretes por notificação** ("amanhã você tem médico").
- [ ] **Fase 7 – Novas categorias** (lojas, metas etc.) conforme você precisar.

---

## 4. Tarefas suas (manuais)

- [ ] **Rodar o `supabase/schema.sql`** no Supabase: abra **SQL Editor**, clique em **New query**, cole o arquivo inteiro e clique em **Run**. Pode rodar quantas vezes quiser, porque ele não apaga dados. Isso cria:
  - a coluna do histórico de ações (que evita duplicados);
  - a lixeira;
  - a marcação "editado por você".
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
app/(app)/acoes.ts           Editar, lixeira, restaurar
app/api/chat/route.ts        Conversa com a IA (ferramentas, mascote, histórico de ações)
lib/ferramentas.ts           O que a IA consegue fazer no banco
components/                  Peças das telas (chat, listas, mascote, logo, vidro)
supabase/schema.sql          Banco de dados (rodar de novo a cada atualização)
docs/PUBLICAR.md             Como publicar e instalar no celular
public/mascote/              Imagens do mascote <R/>
```
