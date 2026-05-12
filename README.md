# Mapeamento da Saúde - Votorantim

Projeto desenvolvido como Trabalho de Conclusão de Curso (TCC) focado em criar um mapa interativo para facilitar o acesso à informação sobre a rede de saúde municipal da cidade de Votorantim - SP.

## 🚀 Funcionalidades

- **Mapa Interativo (Público):** Permite a qualquer munícipe localizar as UBSs e ESFs mais próximas da sua residência utilizando geolocalização e rotas do Leaflet.
- **Portal de Campanhas (Público):** Mural dinâmico para acompanhamento de alertas médicos, mutirões de vacinação e outros informativos de saúde da prefeitura.
- **Painel da Saúde (Restrito):** Área protegida por senha, designada aos profissionais de saúde para emissão rápida de alertas e eventos.
- **Painel Administrativo (Restrito):** Área exclusiva para administradores da prefeitura para gerenciar unidades geográficas no mapa e ter acesso irrestrito ao sistema.

## 💻 Tecnologias Utilizadas

- **Frontend:** React (SPA), Vite, Tailwind CSS (v4), React-Leaflet, Lucide React.
- **Backend / Banco de Dados:** Supabase (PostgreSQL).
- **Autenticação:** Supabase Auth (Sistema RBAC com perfis "adm" e "saude").
- **Segurança:** Row Level Security (RLS) habilitado para evitar acesso direto não autorizado ao banco.

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
Crie um arquivo `.env` na raiz do projeto com as chaves do seu Supabase (disponíveis em Project Settings > API):
```env
VITE_SUPABASE_URL=Sua_URL_aqui
VITE_SUPABASE_ANON_KEY=Sua_Anon_Key_aqui
VITE_SUPABASE_SERVICE_ROLE_KEY=Sua_Service_Role_Key_aqui
```

4. **Inicie o servidor de desenvolvimento:**
```bash
npm run dev
```

## 🗄️ Como configurar o Banco de Dados (Supabase)
O repositório inclui um script de inicialização completo (`setup_database.sql`).
1. Crie um novo projeto no [Supabase](https://supabase.com).
2. Acesse a aba **SQL Editor**.
3. Copie o conteúdo de `setup_database.sql` e cole no painel.
4. Clique em "Run". O script automaticamente criará todas as tabelas, aplicará as camadas de segurança (RLS), populará as unidades de Votorantim no mapa e criará os usuários de teste de administrador e saúde.
