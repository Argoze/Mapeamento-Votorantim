# Análise de tecnologias e viabilidade técnica - TCC

**Projeto:** Mapeamento Territorial Inteligente de Unidades de Saúde de Votorantim
**Foco da análise:** Custo zero (open-source / free-tier) para a prefeitura municipal.

---

## 1. Introdução

Este documento apresenta um estudo comparativo das tecnologias disponíveis para a implementação do sistema de mapeamento de saúde do município de Votorantim. A premissa fundamental deste projeto é a **restrição orçamentária absoluta (R$ 0,00)**. A prefeitura não dispõe de verba para aquisição de licenças de software, mensalidades de APIs pagas ou registro de cartões de crédito institucionais em plataformas de nuvem sujeitas a cobranças excedentes. 

Por conta disso, nossa escolha técnica descarta sumariamente opções líderes de mercado que exigem vinculação de pagamento (mesmo que possuam cotas gratuitas), priorizando soluções de **código aberto (open-source)** e de acesso público e gratuito.

---

## 2. API de mapas e geocodificação (busca de endereços)

Para criar um mapa interativo, precisamos de três pilares: a biblioteca que renderiza o mapa no navegador, o provedor das imagens do mapa (tiles) e o serviço que transforma texto de endereço em coordenadas (geocoding).

### 2.1. Renderização do mapa e tiles (imagens)
- **Google Maps API / Mapbox:**
  - *Estudo:* São as ferramentas mais famosas do mercado. O Mapbox oferece 50.000 visualizações gratuitas/mês e o Google oferece $200 de crédito.
  - *Problema:* Ambas **exigem cadastro de cartão de crédito**. Caso a aplicação viralize ou seja muito acessada pelos munícipes, a prefeitura receberia faturas altas em dólar. Além disso, a burocracia para aprovar um cartão corporativo do município para uma API é um impeditivo enorme.
- **Leaflet.js + OpenStreetMap (OSM) / CartoDB:**
  - *Estudo:* O Leaflet é a biblioteca open-source líder para mapas interativos. O OpenStreetMap é a "Wikipédia dos mapas", mantido pela comunidade e gratuito. Para um visual mais limpo, usamos os tiles base do CARTO (Positron), que também são gratuitos para uso público.
  - *Veredito:* **ESCOLHIDO.** Custo R$ 0,00 absoluto. Não exige chave de API paga, não exige cartão de crédito e não tem risco de cobrança surpresa.

### 2.2. Serviço de busca de endereços (geocodificação)
- **Google Geocoding API:**
  - *Estudo:* Altamente preciso, mas custa cerca de US$ 5,00 a cada 1.000 requisições após o limite. Inviável pelo risco financeiro.
  - *Veredito:* Descartado.
- **Nominatim (OpenStreetMap):**
  - *Estudo:* Serviço gratuito do ecossistema OSM. Ele busca endereços em sua base de dados aberta. Possui uma limitação de 1 requisição por segundo na API pública.
  - *Veredito:* **ESCOLHIDO.** Como a busca de endereços é feita apenas quando o munícipe digita um local específico (uso pontual), a limitação de 1 req/segundo atende perfeitamente a demanda de uma cidade do porte de Votorantim. Se no futuro houver milhares de acessos simultâneos, a prefeitura pode instalar o Nominatim em um servidor próprio, mantendo o custo de licença em R$ 0,00.

---

## 3. Definição do banco de dados e autenticação de usuários

Como o sistema exigirá controle de acesso e diferentes permissões de uso, não é mais possível utilizar apenas arquivos estáticos. Precisamos de um banco de dados real com um sistema de autenticação (login) para três perfis distintos:

1. **ADM (administrador):** Possui acesso total ao sistema, gerencia usuários, configurações globais e tem permissão para disparar alertas e criar eventos de saúde (como mutirões de vacinação) no portal de campanhas.
2. **Saúde (profissional da prefeitura):** Tem permissão para adicionar, editar ou remover locais (UBS/ESF) diretamente no mapa, além de também poder criar alertas e novos eventos para a população.
3. **Paciente (munícipe):** Possui acesso de leitura. Apenas utiliza a aplicação para buscar endereços, ver o local de atendimento mais próximo e visualizar a página de alertas e campanhas da secretaria de saúde.

### 3.1. Opções descartadas (riscos de custo e lock-in)
- **AWS RDS ou Google Cloud SQL:** Serviços corporativos robustos, mas que geram faturas mensais em dólar desde o primeiro dia.
- **Firebase (plano Spark):** Apesar de possuir um plano gratuito, utiliza banco NoSQL proprietário do Google. Se a prefeitura decidir hospedar o sistema internamente no futuro, seria necessário reescrever todo o código (o chamado *vendor lock-in*).

### 3.2. As opções viáveis (custo R$ 0,00)

**Opção A: PostgreSQL + backend próprio (on-premise)**
- *Análise:* É o padrão ouro global (código aberto). Se a prefeitura de Votorantim possuir **servidores físicos próprios (datacenter municipal)**, podemos instalar o PostgreSQL gratuitamente. 
- *Autenticação:* Exigiria o desenvolvimento manual do sistema de login e permissões do zero (o que consome muito tempo do TCC).

**Opção B: Supabase (backend-as-a-service - free tier)**
- *Análise:* O Supabase é a alternativa open-source ao Firebase. Ele roda um banco **PostgreSQL** autêntico por trás e oferece um **plano gratuito vitalício** muito generoso (suporta até 50.000 usuários ativos por mês).
- *Autenticação e perfis:* Já possui um sistema de autenticação (Auth) pronto e segurança em nível de linha (RLS - row level security). Isso torna extremamente fácil criar as regras: *se for paciente, apenas lê; se for saúde, pode adicionar locais e eventos*.
- *Garantia contra custos:* Se um dia a aplicação ultrapassar os limites do plano gratuito, a prefeitura não perde nada. Por ser PostgreSQL puro, basta exportar os dados e rodar no servidor da prefeitura gratuitamente, sem precisar refazer a aplicação.

### 3.3. Justificativa final de escolha do banco de dados
Para este TCC e para a realidade da prefeitura, a tecnologia escolhida é o **Supabase**. 

Ele resolve perfeitamente a necessidade de ter múltiplos usuários (ADM, saúde, paciente) de forma segura, suporta a criação do módulo de alertas/eventos de vacinação, entrega um banco PostgreSQL profissional para salvar as coordenadas dos mapas e garante que a prefeitura **não gastará 1 real sequer** com servidores ou licenças. Além disso, a prefeitura fica livre de amarras comerciais por se tratar de uma ferramenta open-source.

---

## 4. Conclusão

Através deste estudo técnico, garantimos que a solução proposta para o município de Votorantim é **tecnologicamente avançada**, aderente às melhores práticas de desenvolvimento web moderno, e o mais importante: **imune a dívidas tecnológicas e cobranças de licenças ou mensalidades de APIs**.

A adoção do **Leaflet**, provedores de mapa **OpenStreetMap**, buscador de CEP **Nominatim** e estrutura de dados sem servidor demonstram que é perfeitamente viável modernizar os serviços públicos de saúde e entregar valor real ao munícipe com investimento financeiro de exatamente **zero reais**.
