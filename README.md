# Insightory.Lab — Website

Site institucional de uma página. HTML/CSS/JS puros — sem build, sem dependências, sem framework.

```
index.html
css/style.css
js/main.js
assets/
  logo.svg         (wordmark vetorial, traçado a partir do PNG; usado na navegação e no rodapé)
  logo-black.png   (logótipo a preto, para fundos claros; usado como favicon)
  logo-white.png   (logótipo a branco, para fundos escuros)
```

O tipo de letra é a General Sans (pesos 400, 500 e 600), carregada da Fontshare por um `<link>` no `<head>`. É a única família do site: os títulos usam o peso 600 e o texto o 400.

## Antes de publicar

Substitui os seguintes placeholders em `index.html` (procura por `href="#"`):

- Links de LinkedIn / Instagram
- Links de Política de Privacidade e Termos & Condições, no rodapé

O email de contacto é `geral@insightorylab.com`. Aparece no hero (texto e botão de copiar), no menu móvel, na secção de contacto e na `action` do formulário; se mudar, procura por `geral@insightorylab.com` em `index.html`.

## Chatbot com IA

O botão de vidro no canto inferior direito abre uma conversa com um assistente. Ele só responde com o que está em `supabase/functions/chat-insightory/knowledge.ts` (o conteúdo do site mais o que você acrescentar). Fora disso, recusa e encaminha para `geral@insightorylab.com`.

Como funciona:

- O site (`js/main.js`, bloco "Chat: assistente de IA") envia o histórico recente para uma função do Supabase, indicada em `data-endpoint` no `#chatMount` do `index.html`. A chave da IA fica na função e nunca no site.
- A função vive no projeto Supabase do Website HS (`lbqlekwqylwaasleedgj`), onde já estão os segredos da OpenAI. Chama-se `chat-insightory` e é independente da função `chat` do Hotel Solutions.
- Não guarda conversas. O histórico fica só no separador do visitante (`sessionStorage`).
- Limite de 10 pedidos por minuto e 60 por hora por visitante. O contador está na tabela `chat_rate_limits` (migração `20261003150000` no repositório do Website HS) e guarda só um código cifrado do IP, durante 1 a 2 horas.
- Só aceita pedidos vindos de `insightorylab.com`, `www.insightorylab.com`, `gugas55.github.io` e `localhost:8000` (variável `ALLOWED_ORIGINS`).

Para mudar o que o assistente sabe:

1. Edite o texto em `supabase/functions/chat-insightory/knowledge.ts`. A secção "INFORMAÇÃO ADICIONAL" é para o que quiser acrescentar além do site. Quando o texto do site mudar, atualize também este ficheiro.
2. Publique a função (o `supabase` CLI tem de ter sessão iniciada):

```bash
supabase functions deploy chat-insightory --project-ref lbqlekwqylwaasleedgj --no-verify-jwt --use-api
```

Para a privacidade: as mensagens do visitante são enviadas à OpenAI para gerar a resposta. O painel avisa que são respostas de IA e pede para não partilhar dados pessoais; a política de privacidade do site deve mencionar isto e o contador por IP.

Ligações com o resto da página: `window.InsightoryChat` expõe `open()`, `close()`, `toggle()`, `mount` e `ready()`, e o `document` emite `insightory:chat-open` e `insightory:chat-close`. O estilo está em `css/style.css` (blocos "Chat").

## Trocar as ilustrações do portefólio por projetos reais

As quatro pranchas do portefólio têm ilustrações marcadas como "Exemplo ilustrativo". Para cada projeto real, em `index.html`, substitui o `<svg class="plate__art">…</svg>` por

```html
<img class="plate__art" src="assets/projetos/nome-do-projeto.jpg" alt="Descrição do projeto" loading="lazy">
```

e apaga a linha `<p class="plate__note">Exemplo ilustrativo</p>` dessa prancha. A moldura adapta-se à proporção da imagem.

## Testar localmente

Não precisa de instalação — basta abrir `index.html` no browser. Para testar com um servidor local (recomendado, evita bloqueios de CORS em alguns browsers):

```bash
python3 -m http.server 8000
# depois abrir http://localhost:8000
```

## Deploy

O site é 100% estático, por isso pode ser publicado em qualquer serviço de hosting estático. Duas opções simples e gratuitas:

### Opção A — Netlify (arrastar e largar)
1. Ir a [app.netlify.com/drop](https://app.netlify.com/drop)
2. Arrastar a pasta `ISLAB Website` completa para a página
3. Pronto — fica disponível num domínio `*.netlify.app` instantaneamente
4. Depois, em "Domain settings", pode ligar-se um domínio próprio (ex: insightorylab.com)

### Opção B — Vercel (via CLI)
```bash
npm install -g vercel
cd "ISLAB Website"
vercel login
vercel --prod
```

### Opção C — GitHub Pages
1. Criar um repositório novo no GitHub
2. `git remote add origin <url-do-repo>` e `git push -u origin main`
3. Nas definições do repositório → Pages → escolher a branch `main` e pasta `/root`
4. O site fica disponível em `https://<utilizador>.github.io/<repo>/`

Em qualquer uma das opções, basta apontar o registo DNS do domínio (`insightorylab.com` ou o que vier a ser escolhido) para o serviço de hosting.
