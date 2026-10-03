// Conhecimento do chatbot da Insightory.Lab.
//
// É a ÚNICA fonte de que o assistente pode responder. Tudo o que não estiver aqui,
// ele diz que não sabe e encaminha para a equipa.
//
// Como editar:
//   1. Mude o texto abaixo (ou acrescente informação na secção "INFORMAÇÃO ADICIONAL").
//   2. Volte a publicar a função:
//        supabase functions deploy chat-insightory --project-ref lbqlekwqylwaasleedgj --no-verify-jwt
//   Não use o carácter ` (acento grave) nem a sequência ${ dentro do texto.
//
// Quando o texto do site mudar, atualize também este ficheiro.

export const KNOWLEDGE = String.raw`
EMPRESA
A Insightory.Lab é uma consultora de design digital. Cria identidade visual, websites e aplicações à medida que simplificam processos internos. Lema do site: "Simplificamos o seu negócio, por fora e por dentro." Trabalha com empresas já estabelecidas que querem modernizar a marca, o website ou os processos, e com quem está a lançar um negócio do zero.

SERVIÇOS
- Identidade e marca: logótipo, sistema visual e diretrizes que mantêm a consistência em qualquer suporte.
- Websites e e-commerce: plataformas rápidas e claras, desenhadas para contar a história certa. Inclui websites, lojas online e performance.
- Plataformas e dashboards: ferramentas internas que organizam dados e automatizam tarefas repetitivas.
- Automação de processos: substituição de folhas de cálculo dispersas por sistemas únicos, claros e feitos à medida da equipa. Inclui integrações e fluxos automáticos.
- Parceria contínua: acompanhamento depois do lançamento, com manutenção, evolução e suporte.

COMO TRABALHAMOS (QUATRO PASSOS)
1. Descoberta: começam por perceber o negócio, a equipa e onde se perde tempo. Desta fase sai um plano e um orçamento à medida.
2. Design: desenham a marca, as páginas ou os ecrãs até tudo fazer sentido à primeira vista. Inclui uma ronda de revisões.
3. Desenvolvimento: constroem e testam com casos reais, ligados às ferramentas que a equipa já usa.
4. Lançamento: entregam, publicam e acompanham os primeiros dias. Depois disso, continuam por perto.

MODELOS DE COLABORAÇÃO
Não há preços públicos. Cada projeto é orçamentado à medida, depois de perceberem o que é preciso. Há dois modelos:
- Projeto único: ideal para uma necessidade específica, como uma marca nova, um website ou uma aplicação. Inclui descoberta e estratégia, design à medida, desenvolvimento e testes, entrega e lançamento, uma ronda de revisões e suporte por email. Orçamento à medida.
- Parceria contínua: para empresas que precisam de evolução constante, com novas funcionalidades, novos materiais e otimização contínua. Inclui tudo o que está no Projeto único, horas de design e desenvolvimento reservadas por mês, prioridade no calendário, otimização e manutenção contínuas, reuniões mensais de acompanhamento e suporte prioritário. Mensalidade sob consulta.
Depois do lançamento: no Projeto único há suporte por email. Na Parceria contínua há horas de design e desenvolvimento todos os meses, com prioridade no calendário e reuniões mensais de acompanhamento.

PERGUNTAS FREQUENTES
- Que tipo de projetos fazem? Identidade e marca, websites e lojas online, plataformas e dashboards internos, e automação de processos. É frequente o mesmo cliente precisar de mais do que um, e tratam de todos em conjunto.
- Quanto custa um projeto? Cada projeto é orçamentado à medida, depois de perceberem o que é preciso. Há dois modelos: Projeto único, para uma necessidade específica, e Parceria contínua, com mensalidade, para quem precisa de evolução constante.
- Já temos marca e website. Podem melhorar o que existe? Sim. Trabalham tanto com quem está a lançar do zero como com empresas que querem modernizar a marca, o website ou os processos que já têm.

PORTEFÓLIO
O site mostra quatro exemplos ilustrativos, que são exemplos por tipo de projeto e não trabalhos de clientes concretos: rebranding e sistema visual; plataforma de reservas online; painel de gestão interna; loja online B2B. O portefólio completo está disponível mediante pedido.

CLIENTES
O site mostra, na secção Clientes, os logótipos de: ISEC Lisboa Associação Académica, AAUAL (Associação Académica da Universidade Autónoma de Lisboa), Dom José Beach Hotel, Feel Your Travel e TWK Studios.

CONTACTO
- Email: geral@insightorylab.com
- Telefone: +351 913 469 386
- Localização: Portugal, com trabalho remoto na Europa.
- Formulário de contacto na secção Contacto do site. Respondem pessoalmente a todas as mensagens.

INFORMAÇÃO QUE O SITE NÃO TEM
Preços, prazos, dimensão da equipa, morada, redes sociais, tecnologias concretas e condições contratuais não estão no site. Para estes temas, o assistente não responde e encaminha para a equipa.

INFORMAÇÃO ADICIONAL (definida pelo responsável do site)
(Nada acrescentado por agora. Escreva aqui, em frases simples, o que mais o assistente pode responder.)
`;
