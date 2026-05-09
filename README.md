# Mapeamento Territorial Inteligente - Votorantim 🗺️🏥

Uma aplicação web interativa desenvolvida para facilitar a busca por Unidades Básicas de Saúde (UBS) e unidades de Estratégia de Saúde da Família (ESF) no município de Votorantim, São Paulo.

O sistema permite que o usuário encontre rapidamente a unidade de atendimento médico mais próxima de sua localização atual ou de um endereço específico, exibindo a distância exata, mapa e demais informações.

## 🚀 Funcionalidades

- **Busca por Localização Atual (GPS)**: Utiliza a API de Geolocalização do navegador para encontrar unidades de saúde baseadas na localização real do usuário.
- **Busca por Endereço**: Permite a pesquisa manual de um endereço de referência via OpenStreetMap (Nominatim).
- **Cálculo de Proximidade (Raio de Busca)**: Identifica e filtra as unidades em um raio ajustável (de 1 a 15 km) através do cálculo preciso da Fórmula de Haversine.
- **Ordenação Inteligente**: As unidades são automaticamente ordenadas da mais próxima para a mais distante, com um selo de destaque para a opção mais rápida.
- **Mapa Interativo**: Exibição dos pontos em um mapa fluido (Leaflet/CartoDB) com design limpo.
- **Interface Responsiva**: Design moderno "glassmorphism", utilizando Tailwind CSS para se adaptar a diferentes telas de dispositivos.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, Vanilla JavaScript, Tailwind CSS.
- **Mapas**: [Leaflet.js](https://leafletjs.com/) e provedor de mapas do [CARTO](https://carto.com/).
- **Geocodificação em Backend/Scraping**: Python (`geopy`) para realizar o fetch inicial, correção das coordenadas de endereços das unidades e geração do arquivo estático de dados (`dados_votorantim.json`).
- **Fontes e UI**: Google Fonts (Inter) e ícones minimalistas customizados.

## 📂 Estrutura do Projeto

- `index.html`: Arquivo principal contendo toda a interface gráfica e a lógica JavaScript para a exibição de resultados, renderização do mapa e cálculo de distâncias.
- `geocoder.py`: Script Python para extrair as coordenadas latitude/longitude baseadas nos endereços de Votorantim e gerar o arquivo JSON correspondente.
- `dados_votorantim.json`: Base de dados estática gerada contendo a lista completa e geocodificada de todas as UBS e ESF de Votorantim.

## 🏃 Como Executar

Por ser uma aplicação web baseada inteiramente no lado do cliente (Client-Side), a execução é extremamente simples.

1. Clone o repositório para sua máquina:
   ```bash
   git clone https://github.com/Argoze/Mapeamento-Votorantim.git
   ```
2. Abra a pasta do projeto clonado.
3. Dê um duplo clique no arquivo `index.html` para abri-o diretamente em seu navegador (Chrome, Edge, Firefox, etc.).
   
   *(Opcional: Você pode rodar a aplicação através do VS Code com extensões como o "Live Server" para desenvolvimento em tempo real).*

## 📌 Notas
Os dados iniciais foram extraídos do site oficial da Prefeitura de Votorantim.
