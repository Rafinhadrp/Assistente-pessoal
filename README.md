# Assistente Pessoal

App pessoal (PWA) para conversar com uma IA que guarda finanças e compromissos.
Veja o `CLAUDE.md` para a visão completa do projeto. **Fase atual: 2 (chat por texto e por voz).**

> 📱 **Para publicar na internet (Vercel) e instalar no celular, siga [`docs/PUBLICAR.md`](docs/PUBLICAR.md).**
> Os passos abaixo são para rodar no seu computador, para testes.

## Requisitos

- Node.js **20.9 ou mais novo** (confira com `node -v`). Recomendado: a versão LTS de nodejs.org.
- Uma conta grátis no [Supabase](https://supabase.com) e uma chave da [API do Claude](https://console.anthropic.com).

## 1. Criar o banco no Supabase

1. Entre em https://supabase.com e clique em **New project**.
2. Dê um nome (ex: `assistente`), crie uma senha do banco (guarde) e escolha a região **South America (São Paulo)**. Clique em **Create new project** e espere uns 2 minutos.
3. No menu da esquerda, abra **SQL Editor** → **New query**.
4. Abra o arquivo `supabase/schema.sql` deste projeto, copie **tudo**, cole lá e clique em **Run**. Deve aparecer "Success. No rows returned".
5. (Recomendado para testar mais rápido) Em **Authentication** → **Sign In / Providers** → **Email**, desligue **Confirm email** e salve. Assim a conta é criada sem precisar clicar no link do e-mail. Se preferir deixar ligado, faça o passo 6.
6. Se deixou a confirmação de e-mail ligada: em **Authentication** → **URL Configuration**, coloque `http://localhost:3000` em **Site URL** e adicione `http://localhost:3000/auth/callback` em **Redirect URLs**.

### Onde pegar as chaves do Supabase

Em **Project Settings** (engrenagem) → **API** (ou **API Keys**, dependendo da versão do painel):

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** (ou **Publishable key**, começa com `sb_publishable_`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** (ou **Secret key**) → `SUPABASE_SERVICE_ROLE_KEY`. **Não é usada na Fase 1**, pode deixar vazia. Nunca compartilhe essa chave.

## 2. Chave do Claude

Em https://console.anthropic.com → **API Keys** → **Create Key**. Copie (começa com `sk-ant-`). A conta precisa ter créditos.

## 3. Configurar e rodar (Windows: PowerShell ou terminal do VS Code)

```bash
npm install
copy .env.example .env.local
```

(No Mac/Linux, o segundo comando é `cp .env.example .env.local`.)

Abra o `.env.local` e preencha:

| Variável | O que colocar |
|---|---|
| `ANTHROPIC_API_KEY` | sua chave `sk-ant-...` |
| `CLAUDE_MODEL` | deixe vazio (usa `claude-opus-5-5`) ou um mais barato: `claude-sonnet-5-5`, `claude-haiku-5-5` |
| `CLAUDE_EFFORT` | opcional: `low` deixa as respostas mais rápidas e baratas |
| `EMAILS_PERMITIDOS` | seu e-mail (só ele pode criar conta e usar o chat). No PC pode ficar vazio; **na Vercel é obrigatório** |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon / publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | pode ficar vazio por enquanto |

Depois:

```bash
npm run dev
```

Abra http://localhost:3000, clique em **Criar conta** e entre.

## 4. Testar

No chat, tente:

- `Recebi 920, é meu pagamento do dia 20`
- `Gastei 35 no mercado`
- `Quanto ainda tenho?`
- `Tenho médico dia 5 às 14h`
- `Quando é meu médico?`
- `Já fui no médico, pode marcar como feito`

Depois confira as abas **Finanças** e **Agenda**.

### Falar em vez de digitar (Fase 2)

Funciona como o ditado do app do Claude: **nada é enviado sozinho**.

1. Toque no **microfone** e fale. Pode fazer pausas.
2. Toque no botão vermelho (■) quando terminar. O texto vai para o campo para você conferir ou corrigir.
3. Toque em **enviar** (a setinha).

Há dois jeitos de transcrever, e o app escolhe sozinho:

- **Deepgram** (se `DEEPGRAM_API_KEY` estiver configurada): enquanto você fala aparece a onda da sua voz; ao parar, o áudio é transcrito no servidor (mais preciso). Para desistir, toque em **Cancelar**.
- **Ditado do próprio celular** (sem a chave): o texto aparece enquanto você fala.

Dicas:
- Para o celular não pedir permissão toda vez, escolha **"Permitir ao usar o app"** ou **"Permitir sempre"**.
- No modo do celular funciona no **Chrome**, **Edge** e **Safari** (no iPhone, a **Siri** e o **Ditado** precisam estar ligados).

### Atualizar o app

- **Puxe a tela para baixo** (estando no topo da página) até a bolinha girar e solte, como no Chrome ou no Safari.
- No chat também tem o botão **↻** no canto de cima.
- Quando houver uma versão nova publicada, aparece no topo **"Nova versão disponível · Atualizar"**.

Para testar o app "instalável" (PWA), rode a versão de produção:

```bash
npm run build
npm start
```

No Chrome do PC aparece um ícone de instalar na barra de endereço. No celular, a instalação funciona depois de publicar na Vercel (precisa de HTTPS).

## Estrutura

```
app/(app)/page.tsx          Chat (tela principal)
app/(app)/financas/         Aba Finanças
app/(app)/agenda/           Aba Agenda (Próximos / Histórico)
app/api/chat/route.ts       Rota que conversa com o Claude (tool use)
app/login/                  Login e cadastro por e-mail
lib/ferramentas.ts          Ferramentas da IA e como elas mexem no banco
lib/datas.ts, dinheiro.ts   Datas no fuso de São Paulo e valores em centavos
supabase/schema.sql         Tabelas, segurança (RLS) e função de saldo
proxy.ts                    Protege as páginas (exige login)
public/sw.js                Service worker do PWA
```
