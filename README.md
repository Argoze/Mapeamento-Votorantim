# Mapeamento da Saúde - Votorantim 🏥🗺️

Projeto desenvolvido como Trabalho de Conclusão de Curso (TCC) focado em criar um mapa interativo de alta fidelidade e portal de notícias integrado para facilitar o acesso à informação e otimizar a gestão da rede de saúde municipal da cidade de Votorantim - SP.

---

## 🚀 Funcionalidades Principais

### 🌐 Portal Público (Cidadão)
- **🗺️ Mapa Interativo de Saúde:** Localiza de forma instantânea UBSs, ESFs, Hospitais e UPAs da cidade.
- **📍 Geolocalização & Rotas:** Identifica a localização atual do usuário e calcula automaticamente a distância para as unidades mais próximas, ordenando-as da mais perto para a mais distante. 
- **🎒 Abertura Dinâmica de Popups:** Ao clicar em uma unidade na barra lateral, o mapa centraliza automaticamente, fecha qualquer popup anterior e abre o novo popup informativo de forma fluida.
- **🖼️ Mini-Galeria nos Popups:** Exibição dinâmica de fotos reais de cada unidade de saúde no próprio balão informativo do mapa.
- **📰 Portal de Notícias Completo:** Área inspirada no design da Secretaria de Saúde de Sorocaba com notícias da saúde pública, buscas em tempo real, artigos em destaque e carrossel de fotos interativo (suporta até 10 fotos por notícia).
- **📢 Mural de Alertas e Campanhas:** Visualização de mutirões de vacinação, campanhas e avisos urgentes sinalizados no mapa e em página exclusiva, com galerias de fotos rotativas.
- **🎯 Filtros, botão de urgência e ações rápidas no mapa:** Chips para filtrar por tipo de unidade (UBS/ESF/Hospital/UPA), atalho direto para o Hospital/UPA mais próximo em caso de necessidade urgente, favoritar unidades de referência e ligar/traçar rota/compartilhar via WhatsApp direto no card da unidade.
- **♿ Acessibilidade (e-MAG/WCAG):** Barra de acessibilidade flutuante com ajuste de tamanho de fonte e alto contraste (preferência salva no navegador), link de "pular para o conteúdo", indicador de foco reforçado, navegação por teclado e rótulos ARIA em menus, filtros, favoritos e carrosséis — presente em todas as páginas públicas (mapa, eventos e notícias).

### 🔒 Áreas Restritas (Gestores)
- **🩺 Painel da Saúde (Médicos/Profissionais):** Área para postagem rápida de avisos, eventos de vacinação e alertas informativos ou urgentes, com edição de conteúdo já publicado e pré-visualização antes de ir ao ar.
- **🛡️ Painel Administrativo (Controle Total do ADM):**
  - **📊 Dashboard com indicadores:** Painel inicial com panorama territorial (totais por tipo de unidade), atividade recente (últimos eventos/notícias/unidades cadastrados) e indicadores de qualidade dos dados (unidades sem telefone/imagem, notícias sem conteúdo), com atalho direto para revisar cada item pendente.
  - **Gerenciamento de Notícias e Eventos:** Publicação com suporte a formatação de resumo, conteúdo estendido, upload múltiplo de imagens, edição de itens já publicados e pré-visualização antes de publicar.
  - **Cadastro de Unidades:** Adição de novas UBSs, ESFs, Hospitais e UPAs de forma interativa, com edição de registros já cadastrados.
  - **📥 Importação em massa de unidades (CSV):** Upload de uma planilha CSV com várias unidades de uma vez, com pré-visualização e validação linha a linha (nome/endereço/coordenadas), detecção automática de separador e de colunas, normalização de nomes (ex.: "PSF" → "ESF") e seleção manual do que será de fato importado.
  - **🤖 Geocodificação Inteligente (Auto-GPS):** Ao digitar o endereço do novo posto, o botão *"Buscar Coordenadas"* consulta a API Nominatim (OpenStreetMap) em segundo plano com tratamento inteligente de caracteres especiais e abreviações, preenchendo automaticamente a Latitude e a Longitude sem esforço manual.
  - **💡 Preview em Tempo Real:** Visualização dinâmica antes de salvar mostrando o prefixo correto (ex: *ESF*, *UPA*, *Hospital*) integrado ao sistema de ícones do mapa.
  - **🕵️ Trilha de auditoria:** Registro de quem criou, editou ou excluiu cada evento, notícia, unidade ou usuário, e quando — com filtro por tipo de item. O registro é preservado mesmo depois que o item original é excluído (ver seção **Trilha de auditoria (LGPD)** abaixo).
  - **Gerenciamento de Usuários:** Criação de novos perfis de acesso corporativo com privilégios diferenciados.

---

## 🎛️ Componentes Customizados Premium

- **`ImageUpload.jsx`:** Componente de upload múltiplo com suporte a drag-and-drop, indicador de progresso, grid de miniaturas com exclusão instantânea e armazenamento em bucket do Supabase Storage.
- **`DateTimePickerModal.jsx`:** Seletor visual completo de data e hora para evitar dados inconsistentes e inválidos inseridos manualmente no banco.
- **`NewsCarousel.jsx`:** Carrossel dinâmico na home que rotaciona as notícias em destaque com transição suave, contadores inteligentes e suporte a auto-play.
- **`AccessibilityToolbar.jsx`:** Barra flutuante de acessibilidade (fonte/contraste), com preferência persistida no navegador e presente em todas as páginas públicas.
- **`PublishPreviewModal.jsx`:** Modal de pré-visualização de evento/notícia antes da publicação, mostrando como o conteúdo vai aparecer para o cidadão.

---

## 💻 Tecnologias Utilizadas

- **Frontend:** React.js, Vite, Tailwind CSS (Aesthetics), React-Leaflet (Mapas), Lucide React (Ícones).
- **Backend / Banco de Dados:** Supabase (PostgreSQL).
- **Autenticação:** Supabase Auth (Sistema RBAC com perfis "adm" e "saude").
- **Segurança:** Row Level Security (RLS) habilitado com políticas personalizadas para o Supabase Storage (bucket `imagens`) e tabelas relacionais.

---

## ⚙️ Como executar o projeto (Local)

1. **Clone o repositório:**
```bash
git clone https://github.com/Argoze/Mapeamento-Votorantim.git
cd Mapeamento-Votorantim
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configuração de Variáveis de Ambiente:**
Crie um arquivo `.env` na raiz do projeto com as chaves **públicas** do seu Supabase (Project Settings > API):
```env
VITE_SUPABASE_URL=Sua_URL_aqui
VITE_SUPABASE_ANON_KEY=Sua_Anon_Key_aqui
```

> ⚠️ **Nunca** coloque a *Service Role Key* em uma variável `VITE_*`. Qualquer variável com esse
> prefixo é embutida no bundle JS público pelo Vite — ou seja, ficaria visível para qualquer
> pessoa que abrisse as ferramentas de desenvolvedor do navegador. A Service Role Key só é usada
> pela Edge Function `create-user` (veja a seção **Criação de usuários (Edge Function)** abaixo).

4. **Inicie o servidor de desenvolvimento:**
```bash
npm run dev
```

---

## 🗄️ Como configurar o Banco de Dados (Supabase)

O repositório inclui um script de inicialização completo (`setup_database.sql`).

### Projeto novo (banco ainda vazio)
1. Crie um novo projeto no [Supabase](https://supabase.com).
2. Acesse a aba **SQL Editor**.
3. Copie **todo** o conteúdo de `setup_database.sql` e execute. Isso cria as tabelas (`unidades`,
   `eventos`, `perfis`, `auditoria`), as políticas de RLS e os dados iniciais das unidades de saúde.
4. Para garantir o suporte a **múltiplas imagens nas notícias** e as **permissões de ADM para unidades**, execute também os comandos a seguir no SQL Editor:

```sql
-- Suporte a múltiplas imagens na tabela de notícias
ALTER TABLE public.noticias ADD COLUMN imagens TEXT[];

-- Políticas de RLS da tabela unidades
CREATE POLICY "Leitura pública de unidades" 
ON public.unidades FOR SELECT USING (true);

CREATE POLICY "Gerenciamento completo para ADMs na tabela unidades" 
ON public.unidades FOR ALL 
USING (public.get_user_role() = 'adm');
```

### Projeto já configurado antes (atualizando para a versão mais recente)
Se seu banco já foi criado com uma versão anterior deste script, **não rode o arquivo inteiro de novo**
— as instruções `CREATE TABLE` do início vão falhar com erro `relation "unidades" already exists`,
porque essas tabelas já existem. Rode apenas os blocos no final do arquivo, marcados como
"ATUALIZAÇÃO OPCIONAL (idempotente)" — eles podem ser executados quantas vezes for preciso sem erro:

```sql
-- Coluna de telefone da unidade (habilita o botão de ligação direta no mapa)
ALTER TABLE public.unidades ADD COLUMN IF NOT EXISTS telefone TEXT;

-- Tabela de trilha de auditoria (quem criou/editou/excluiu cada item, e quando)
-- Copie o bloco completo da seção "trilha de auditoria" de setup_database.sql,
-- da linha "CREATE TABLE IF NOT EXISTS public.auditoria" até o final do arquivo.
```

---

## 🔐 Criação de usuários (Edge Function)

A criação de novos usuários (`/admin` → "Cadastrar Usuário") roda em uma **Supabase Edge Function**
(`supabase/functions/create-user`), não mais diretamente no frontend. Isso existe porque criar um
usuário via API exige a *Service Role Key* do Supabase — uma chave que ignora todas as políticas de
RLS — e essa chave nunca pode estar em código que roda no navegador do usuário.

Para habilitar essa função no seu projeto Supabase:

1. Instale a [Supabase CLI](https://supabase.com/docs/guides/cli) e faça login (`supabase login`).
2. Associe a CLI ao seu projeto: `supabase link --project-ref SEU_PROJECT_REF`.
3. Publique a função:
   ```bash
   supabase functions deploy create-user
   ```

**Não é preciso rodar `supabase secrets set` para a Service Role Key.** O Supabase já injeta
automaticamente `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` em toda Edge
Function publicada — por isso a própria CLI recusa (`Env name cannot start with SUPABASE_`) se você
tentar configurar esses três nomes manualmente. Isso é esperado, não é um erro.

A função só executa a criação depois de conferir, no próprio servidor, que quem está chamando é um
usuário autenticado com papel `adm` — o frontend nunca lida diretamente com a Service Role Key.

---

## 🕵️ Trilha de auditoria (LGPD)

Toda vez que um evento, notícia, unidade ou usuário é criado, editado ou excluído (pelo painel `/admin`
ou `/saude`), o sistema registra na tabela `public.auditoria` quem fez a ação e quando — relevante para
governança e para conformidade com a LGPD, já que o sistema trata dados pessoais (nome, e-mail) de
usuários vinculados à Secretaria de Saúde.

- O registro fica preservado mesmo depois que o item original é excluído (é justamente nesse momento
  que saber "quem excluiu o quê" mais importa).
- Só um ADM pode visualizar a trilha completa (política de RLS); cada usuário só pode registrar ações
  em nome de si mesmo.
- Se o registro de auditoria falhar por algum motivo (ex.: a tabela `auditoria` ainda não foi criada
  no seu banco — ver seção **Como configurar o Banco de Dados** acima), a ação principal do usuário
  **não é bloqueada**; o sistema apenas avisa no console do navegador.
