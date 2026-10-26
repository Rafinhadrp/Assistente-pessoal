# Publicar na Vercel e instalar no celular

Como funciona: o código fica no **GitHub**. A **Vercel** pega esse código e coloca o site no ar com um endereço `https://...vercel.app`. No **celular** você abre esse endereço e "instala" na tela inicial. Aí ele vira um ícone que abre em tela cheia, como um aplicativo. No PC é o mesmo site.

```
GitHub (código)  →  Vercel (site no ar, https)  →  Celular / PC (app instalado)
                          ↕
                Supabase (banco + login)   e   API do Claude (IA)
```

Toda vez que um código novo entra no GitHub, a Vercel atualiza o site sozinha em 1 ou 2 minutos. Você não precisa reinstalar nada no celular.

---

## Antes de começar

- Banco do Supabase já criado, com o `supabase/schema.sql` rodado (veja o README, passo 1).
- Chave da API do Claude em mãos (`sk-ant-...`).
- Use o mesmo login do GitHub onde está o repositório `Assistente-pessoal`.

---

## Passo 1: Criar o projeto na Vercel

1. Entre em https://vercel.com e clique em **Sign Up** (ou **Log In**). Escolha **Continue with GitHub**.
2. Se perguntar o plano, escolha **Hobby** (grátis).
3. Clique em **Add New…** e depois em **Project**.
4. Na lista "Import Git Repository", ache **Assistente-pessoal** e clique em **Import**.
   - Se ele não aparecer, clique em **Adjust GitHub App Permissions** e libere o repositório.
5. Na tela de configuração:
   - **Framework Preset**: deixe **Next.js** (ela detecta sozinha).
   - **Root Directory**: deixe como está (`./`).
   - Ainda **não** clique em Deploy. Primeiro abra **Environment Variables** (passo 2).

## Passo 2: Colocar as variáveis (as "senhas" do app)

Ainda na mesma tela, em **Environment Variables**, adicione uma por uma. Escreva o nome exatamente igual, colando o valor e clicando em **Add**:

| Nome | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | sua chave `sk-ant-...` |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon / publishable do Supabase |
| `EMAILS_PERMITIDOS` | **o seu e-mail** (o mesmo que vai usar para entrar) |
| `CLAUDE_MODEL` | opcional: `claude-sonnet-5-5` para gastar menos. Se ficar vazio, usa `claude-opus-5-5` |
| `CLAUDE_EFFORT` | opcional: `low` para respostas mais rápidas |

> ⚠️ **Não pule o `EMAILS_PERMITIDOS`.** O site fica público na internet. Sem ele, qualquer pessoa que descobrir o endereço pode criar conta e conversar com a IA usando os **seus** créditos.

A `SUPABASE_SERVICE_ROLE_KEY` não é necessária agora. Não coloque.

Agora clique em **Deploy** e espere de 1 a 3 minutos. No fim aparece "Congratulations!" e o endereço do site, algo como `https://assistente-pessoal-xxxx.vercel.app`. **Copie esse endereço.**

## Passo 3: Avisar o Supabase sobre o endereço novo

Isso é necessário para o login funcionar no site publicado.

1. No Supabase, abra **Authentication** e depois **URL Configuration**.
2. Em **Site URL**, cole o endereço da Vercel (ex: `https://assistente-pessoal-xxxx.vercel.app`).
3. Em **Redirect URLs**, clique em **Add URL** e adicione `https://assistente-pessoal-xxxx.vercel.app/auth/callback` (com o seu endereço). Se quiser continuar testando no PC, adicione também `http://localhost:3000/auth/callback`.
4. Clique em **Save**.

## Passo 4: Criar sua conta e fechar a porta

1. Abra o endereço da Vercel, clique em **Criar conta** e cadastre-se com o e-mail que você colocou em `EMAILS_PERMITIDOS`.
   - Se a confirmação de e-mail estiver ligada no Supabase, abra o e-mail e clique no link.
2. Entre e mande uma mensagem de teste: "Gastei 10 no café".
3. Depois que sua conta estiver funcionando, faça uma proteção extra: no Supabase, abra **Authentication**, depois **Sign In / Providers**, e **desligue "Allow new users to sign up"**. Clique em **Save**. Assim ninguém mais consegue nem criar conta.

## Passo 5: Instalar no celular

**Android (Chrome):**
1. Abra o endereço da Vercel no **Chrome** e faça login.
2. Toque nos **3 pontinhos** (⋮), no canto de cima, e depois em **Instalar app** (ou **Adicionar à tela inicial** → **Instalar**).
3. O ícone roxo "Assistente" aparece na tela inicial.

**iPhone (Safari):**
1. Abra o endereço no **Safari**. Tem que ser o Safari, não o Chrome.
2. Toque no botão **Compartilhar** (o quadrado com a setinha para cima).
3. Role a lista, toque em **Adicionar à Tela de Início** e depois em **Adicionar**.
4. Abra pelo ícone novo e faça login de novo. O app instalado guarda o login separado do Safari.

**PC (Chrome ou Edge):** abra o endereço. Na barra de endereço aparece um ícone de **instalar** (um monitor com uma seta). Clique nele.

---

## Atualizações daqui pra frente

- Quando eu terminar uma fase nova, o código vai para o GitHub e a Vercel publica sozinha. Para acompanhar, veja a aba **Deployments** do projeto na Vercel.
- Quando sair uma versão nova, o app mostra no topo **"Nova versão disponível · Atualizar"**. Toque nele.
- Para atualizar a qualquer momento, **puxe a tela para baixo** (no topo da página) até a bolinha girar e solte. No chat também tem o botão **↻** no canto de cima.
- **Mudou alguma variável na Vercel?** Ela só vale depois de publicar de novo: abra **Deployments**, clique nos **⋯** do mais recente e depois em **Redeploy**.

## Problemas comuns

| O que aparece | O que fazer |
|---|---|
| Página "Falta configurar" | Faltam as variáveis do Supabase. Abra **Settings → Environment Variables**, confira os nomes e faça **Redeploy**. |
| "A chave da API do Claude… está faltando ou é inválida" | Confira `ANTHROPIC_API_KEY` e se tem crédito em console.anthropic.com. Depois faça Redeploy. |
| "Este e-mail não tem acesso" | O e-mail do login não é igual ao de `EMAILS_PERMITIDOS`. Corrija a variável e faça Redeploy. |
| Link do e-mail de confirmação abre `localhost` | Falta o passo 3 (Site URL no Supabase). |
| No celular não aparece "Instalar app" | Use o Chrome (Android) ou o Safari (iPhone) e espere a página carregar inteira. |
| Erro ao abrir uma página | Na Vercel, abra **Deployments**, depois o deploy, depois **Logs**. Copie o erro e me mande. |

## Sobre o ramo (branch) do GitHub

Hoje o repositório só tem o ramo `claude/new-session-pvrayw`, e a Vercel publica a partir dele. Funciona normalmente. Se mais tarde você quiser um ramo `main` como "versão oficial", dá para criar e trocar em **Vercel → Settings → Git → Production Branch**.
