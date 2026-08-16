# Insightory.Lab — Website

Site institucional de uma página. HTML/CSS/JS puros — sem build, sem dependências, sem framework.

```
index.html
css/style.css
js/main.js
assets/
  logo-black.png   (logótipo a preto, para fundos claros)
  logo-white.png   (logótipo a branco, para fundos escuros)
```

## Antes de publicar

Substitui os seguintes placeholders em `index.html` (procura por `ola@insightorylab.pt`, `+351 000 000 000` e os `href="#"` nos ícones de redes sociais na secção de contacto e no rodapé):

- Email de contacto
- Telefone
- Links de LinkedIn / Instagram

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
4. Depois, em "Domain settings", pode ligar-se um domínio próprio (ex: insightorylab.pt)

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

Em qualquer uma das opções, basta apontar o registo DNS do domínio (`insightorylab.pt` ou o que vier a ser escolhido) para o serviço de hosting.
