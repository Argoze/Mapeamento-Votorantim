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

## 3. Definição do Banco de Dados

Para armazenar as informações das Unidades Básicas de Saúde (UBS), Estratégias de Saúde da Família (ESF) e suas respectivas coordenadas (Latitude e Longitude).

### 3.1. Opções Descartadas (Riscos de Custo)
- **AWS RDS, Google Cloud SQL, Firebase (Planos Pagos):** Ferramentas excelentes, mas sujeitas a cobrança em dólar. O Firebase possui o plano *Spark* (gratuito), porém os dados ficam presos na plataforma do Google (Vendor Lock-in).

### 3.2. As 3 Opções Viáveis (Custo R$ 0,00)

**Opção A: PostgreSQL + extensão PostGIS**
- *Análise:* É o padrão ouro global para banco de dados relacional com dados geoespaciais. Totalmente gratuito e código aberto.
- *Aplicação no TCC:* Se a prefeitura de Votorantim **já possuir servidores próprios (Datacenter Municipal)**, o PostgreSQL pode ser instalado lá com custo R$ 0,00. 

**Opção B: Banco de Dados Embarcado (SQLite + SpatiaLite)**
- *Análise:* É um banco de dados relacional completo em um único arquivo de computador. Não precisa de servidor rodando, não consome memória em background.
- *Aplicação no TCC:* Ideal caso não haja servidor robusto disponível. O banco fica dentro da própria pasta da aplicação web. Custo R$ 0,00 absoluto e manutenção zero.

**Opção C: Arquivos Estáticos Estruturados (JSON estático) - *A Abordagem Atual***
- *Análise:* Em vez de um banco de dados tradicional, os dados das ~20 unidades de saúde são convertidos de Python para um arquivo estático (JSON) que o site lê diretamente.
- *Aplicação no TCC:* O número de unidades de saúde em uma cidade não muda todo dia. Um arquivo `.json` é perfeitamente capaz de lidar com isso. A prefeitura pode hospedar o site no *GitHub Pages* (hospedagem 100% gratuita). Nenhuma infraestrutura de banco de dados é necessária. **Custo de servidor: R$ 0,00.**

### 3.3. Justificativa Final de Escolha do Banco de Dados
Para o escopo do TCC e da Prefeitura, decidimos estruturar o banco de dados em **duas fases metodológicas**:

1. **Fase Atual (Entrega do TCC - Baixa Complexidade):** Utilização de **JSON Estático**. Isso nos permitiu focar na funcionalidade de cálculo matemático de distância (Fórmula de Haversine) que ocorre no dispositivo do usuário, cortando em 100% a necessidade de um servidor de banco de dados e hospedagem paga, o que garante a adoção imediata pela prefeitura sem licitação ou custos de nuvem.
2. **Fase Futura (Expansão para a Prefeitura):** Recomendamos a utilização oficial do **PostgreSQL**. Quando a Secretaria de Saúde for integrar este sistema aos prontuários e painéis de controle internos já existentes da prefeitura, o PostgreSQL open-source lidará com milhares de registros de forma gratuita.

---

## 4. Conclusão

Através deste estudo técnico, garantimos que a solução proposta para o município de Votorantim é **tecnologicamente avançada**, aderente às melhores práticas de desenvolvimento web moderno, e o mais importante: **imune a dívidas tecnológicas e cobranças de licenças ou mensalidades de APIs**.

A adoção do **Leaflet**, provedores de mapa **OpenStreetMap**, buscador de CEP **Nominatim** e estrutura de dados sem servidor demonstram que é perfeitamente viável modernizar os serviços públicos de saúde e entregar valor real ao munícipe com investimento financeiro de exatamente **zero reais**.
