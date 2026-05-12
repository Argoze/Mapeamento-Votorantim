# Análise de Tecnologias e Viabilidade Técnica - TCC

**Projeto:** Mapeamento Territorial Inteligente de Unidades de Saúde de Votorantim
**Foco da Análise:** Custo Zero (Open-Source / Free-Tier) para a Prefeitura Municipal.

---

## 1. Introdução

Este documento apresenta um estudo comparativo das tecnologias disponíveis para a implementação do sistema de mapeamento de saúde do município de Votorantim. A premissa fundamental deste projeto é a **restrição orçamentária absoluta (R$ 0,00)**. A prefeitura não dispõe de verba para aquisição de licenças de software, mensalidades de APIs pagas ou registro de cartões de crédito institucionais em plataformas de nuvem sujeitas a cobranças excedentes. 

Por conta disso, nossa escolha técnica descarta sumariamente opções líderes de mercado que exigem vinculação de pagamento (mesmo que possuam cotas gratuitas), priorizando soluções de **código aberto (Open-Source)** e de acesso público e gratuito.

---

## 2. API de Mapas e Geocodificação (Busca de Endereços)

Para criar um mapa interativo, precisamos de três pilares: a biblioteca que renderiza o mapa no navegador, o provedor das imagens do mapa (Tiles) e o serviço que transforma texto de endereço em coordenadas (Geocoding).

### 2.1. Renderização do Mapa e Tiles (Imagens)
- **Google Maps API / Mapbox:**
  - *Estudo:* São as ferramentas mais famosas do mercado. O Mapbox oferece 50.000 visualizações gratuitas/mês e o Google oferece $200 de crédito.
  - *Problema:* Ambas **exigem cadastro de cartão de crédito**. Caso a aplicação viralize ou seja muito acessada pelos munícipes, a prefeitura receberia faturas altas em dólar. Além disso, a burocracia para aprovar um cartão corporativo do município para uma API é um impeditivo enorme.
- **Leaflet.js + OpenStreetMap (OSM) / CartoDB:**
  - *Estudo:* O Leaflet é a biblioteca open-source líder para mapas interativos. O OpenStreetMap é a "Wikipédia dos mapas", mantido pela comunidade e gratuito. Para um visual mais limpo, usamos os tiles base do CARTO (Positron), que também são gratuitos para uso público.
  - *Veredito:* **ESCOLHIDO.** Custo R$ 0,00 absoluto. Não exige chave de API paga, não exige cartão de crédito e não tem risco de cobrança surpresa.

### 2.2. Serviço de Busca de Endereços (Geocodificação)
- **Google Geocoding API:**
  - *Estudo:* Altamente preciso, mas custa cerca de US$ 5,00 a cada 1.000 requisições após o limite. Inviável pelo risco financeiro.
  - *Veredito:* Descartado.
- **Nominatim (OpenStreetMap):**
  - *Estudo:* Serviço gratuito do ecossistema OSM. Ele busca endereços em sua base de dados aberta. Possui uma limitação de 1 requisição por segundo na API pública.
  - *Veredito:* **ESCOLHIDO.** Como a busca de endereços é feita apenas quando o munícipe digita um local específico (uso pontual), a limitação de 1 req/segundo atende perfeitamente a demanda de uma cidade do porte de Votorantim. Se no futuro houver milhares de acessos simultâneos, a prefeitura pode instalar o Nominatim em um servidor próprio, mantendo o custo de licença em R$ 0,00.

---

## 3. Definição do Banco de Dados e Autenticação de Usuários

Como o sistema exigirá controle de acesso e diferentes permissões de uso, não é mais possível utilizar apenas arquivos estáticos. Precisamos de um banco de dados real com um sistema de autenticação (Login) para três perfis distintos:

1. **ADM (Administrador):** Possui acesso total ao sistema, gerencia usuários e configurações globais.
2. **Saúde (Profissional da Prefeitura):** Tem permissão para adicionar, editar ou remover locais (UBS/ESF) diretamente no mapa.
3. **Paciente (Munícipe):** Possui acesso de leitura. Apenas utiliza a aplicação para buscar endereços e ver o local mais próximo.

### 3.1. Opções Descartadas (Riscos de Custo e Lock-in)
- **AWS RDS ou Google Cloud SQL:** Serviços corporativos robustos, mas que geram faturas mensais em dólar desde o primeiro dia.
- **Firebase (Plano Spark):** Apesar de possuir um plano gratuito, utiliza banco NoSQL proprietário do Google. Se a prefeitura decidir hospedar o sistema internamente no futuro, seria necessário reescrever todo o código (o chamado *Vendor Lock-in*).

### 3.2. As Opções Viáveis (Custo R$ 0,00)

**Opção A: PostgreSQL + Backend Próprio (On-Premise)**
- *Análise:* É o padrão ouro global (código aberto). Se a prefeitura de Votorantim possuir **servidores físicos próprios (Datacenter Municipal)**, podemos instalar o PostgreSQL gratuitamente. 
- *Autenticação:* Exigiria o desenvolvimento manual do sistema de login e permissões do zero (o que consome muito tempo do TCC).

**Opção B: Supabase (Backend-as-a-Service - Free Tier)**
- *Análise:* O Supabase é a alternativa open-source ao Firebase. Ele roda um banco **PostgreSQL** autêntico por trás e oferece um **Plano Gratuito vitalício** muito generoso (suporta até 50.000 usuários ativos por mês).
- *Autenticação e Perfis:* Já possui um sistema de Autenticação (Auth) pronto e segurança em nível de linha (RLS - Row Level Security). Isso torna extremamente fácil criar a regra: *Se for Paciente, apenas lê; Se for Saúde, pode adicionar locais*.
- *Garantia contra Custos:* Se um dia a aplicação ultrapassar os limites do plano gratuito, a prefeitura não perde nada. Por ser PostgreSQL puro, basta exportar os dados e rodar no servidor da prefeitura gratuitamente, sem precisar refazer a aplicação.

### 3.3. Justificativa Final de Escolha do Banco de Dados
Para este TCC e para a realidade da prefeitura, a tecnologia escolhida é o **Supabase**. 

Ele resolve perfeitamente a necessidade de ter múltiplos usuários (ADM, Saúde, Paciente) de forma segura, entrega um banco PostgreSQL profissional para salvar as coordenadas dos mapas e garante que a prefeitura **não gastará 1 real sequer** com servidores ou licenças. Além disso, a prefeitura fica livre de amarras comerciais por se tratar de uma ferramenta open-source.

---

## 4. Conclusão

Através deste estudo técnico, garantimos que a solução proposta para o município de Votorantim é **tecnologicamente avançada**, aderente às melhores práticas de desenvolvimento web moderno, e o mais importante: **imune a dívidas tecnológicas e cobranças de licenças ou mensalidades de APIs**.

A adoção do **Leaflet**, provedores de mapa **OpenStreetMap**, buscador de CEP **Nominatim** e estrutura de dados sem servidor demonstram que é perfeitamente viável modernizar os serviços públicos de saúde e entregar valor real ao munícipe com investimento financeiro de exatamente **zero reais**.
