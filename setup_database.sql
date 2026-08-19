-- ==========================================
-- SCRIPT DE CONFIGURAÇÃO DO BANCO DE DADOS
-- Projeto: Saúde Votorantim - TCC FACENS
-- Autores: Gustavo Argoze Lopes da Costa
--          Victora Mariucha Raulino de Araruna
-- ==========================================
-- Copie todo este código e cole no "SQL Editor" do seu painel do Supabase e clique em "Run"

-- 1. Criação das Tabelas
CREATE TABLE public.unidades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    endereco TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.eventos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    data_evento TEXT NOT NULL,
    local_evento TEXT NOT NULL,
    tipo TEXT NOT NULL, -- ex: 'Urgente', 'Informativo'
    criado_por UUID REFERENCES auth.users(id),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.perfis (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('adm', 'saude')),
    nome TEXT
);

-- 2. Configuração de Segurança (Row Level Security - RLS)
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Função segura para ler perfis sem causar loop infinito
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = public
STABLE AS $$
  SELECT role FROM public.perfis WHERE id = auth.uid();
$$;

-- Políticas para a tabela UNIDADES
-- Público pode ler as unidades
CREATE POLICY "Leitura pública de unidades" 
ON public.unidades FOR SELECT USING (true);

-- Apenas autenticados (ADM ou Saude) podem inserir/editar/deletar unidades
CREATE POLICY "Gerenciamento de unidades restrito" 
ON public.unidades FOR ALL 
USING (public.get_user_role() IN ('adm', 'saude'));

-- Políticas para a tabela EVENTOS
-- Público pode ler os eventos
CREATE POLICY "Leitura pública de eventos" 
ON public.eventos FOR SELECT USING (true);

-- Apenas autenticados (ADM ou Saude) podem inserir/editar/deletar eventos
CREATE POLICY "Gerenciamento de eventos restrito" 
ON public.eventos FOR ALL 
USING (public.get_user_role() IN ('adm', 'saude'));

-- Políticas para a tabela PERFIS
-- O próprio usuário pode ler seu perfil
CREATE POLICY "Leitura do próprio perfil" 
ON public.perfis FOR SELECT 
USING (auth.uid() = id);

-- Apenas ADM pode gerenciar perfis (ler todos e criar)
CREATE POLICY "Gerenciamento de perfis por ADM" 
ON public.perfis FOR ALL 
USING (public.get_user_role() = 'adm');

-- 3. Inserindo os Dados Iniciais (Unidades de Saúde de Votorantim)
-- Dados atualizados com coordenadas oficiais da Prefeitura de Votorantim (SESA) - Maio/2026
INSERT INTO public.unidades (nome, endereco, lat, lng) VALUES 
('UBS Vila Nova', 'Av. Pedro Augusto Rangel, 1925, Jardim Paulista', -23.538438689804494, -47.41517977503408),
('UBS Vila Garcia', 'Av. Izabel Ferreira Coelho, 271, Vila Garcia', -23.5302131555248, -47.43008008388182),
('UBS Rio Acima', 'Av. Otávio Augusto Rangel, 1822, Rio Acima', -23.535110707938028, -47.4358524288397),
('UBS Barra Funda', 'Rua Lopes Chaves, S/N, Barra Funda', -23.546124989205346, -47.43823819245915),
('UBS Bela Vista', 'Av. São João, 867, Parque Bela Vista', -23.542481004999324, -47.45621366367922),
('Hospital Municipal', 'Rua João Walter, 181, Centro', -23.538, -47.445),
('UPA Central', 'Rua Antônio Walter, 66-146, Centro', -23.5375, -47.446),
('UBS Clarice', 'Rua Mercedes Nardy Arcuri, S/N, Jardim Clarice', -23.550169286798802, -47.46300391944572),
('UBS Itapeva', 'Rua João Santiago Figueira, 200, Jardim Itapeva', -23.577132643220285, -47.46029297527662),
('UBS Novo Mundo', 'Rua Abílio Maia, 46, Jardim Novo Mundo', -23.538202753982333, -47.50406199623655),
('UBS Archila', 'Rua Lázara Bueno de Arruda, 68, Jardim Archilla', -23.53298810679955, -47.444947180429594),
('ESF Promorar', 'Rua Boaventura Maganhato, 138, Promorar', -23.54974586237741, -47.43426277124752),
('ESF Cristal', 'Rua Elcia Pinto da Rosa, 15, Jardim Cristal', -23.577881297055693, -47.470843487482),
('ESF Tatiana', 'Rua Adriano Maciel de Queiroz, s/n, Jardim Tatiana', -23.54316707041551, -47.49434344061035),
('ESF São João', 'Rua Zilda Tescaro Sbrana, 55, Parque São João', -23.568586305802143, -47.45334568146494),
('ESF Green Valley', 'Rua José Raimundo da Silva, 278, Green Valley', -23.558099255324294, -47.49013198691213),
('ESF Amorim', 'Rua José Antônio de Mello, 81, Vila Amorim', -23.555902047984244, -47.44349542711671),
('UBS Serrano', 'Rua Francisco Lopes de Almeida, 76, Jardim Serrano', -23.559879712965266, -47.45464638909843),
('UPA Jataí', 'Rua Carmem Celestina Silva, 322, Parque Jataí', -23.577684633653575, -47.4707576567976),
('UPA Jd. Paulista', 'Rua Ana Rosa de Paula, s/n, Jardim Paulista', -23.53710946153742, -47.42904107711723);

-- ==========================================
-- ATUALIZAÇÃO OPCIONAL (idempotente): telefone da unidade
-- Habilita o botão de ligação direta (tel:) no mapa público.
-- Pode ser rodada novamente sem erro caso a coluna já exista.
-- ==========================================
ALTER TABLE public.unidades ADD COLUMN IF NOT EXISTS telefone TEXT;

-- ==========================================
-- ATUALIZAÇÃO OPCIONAL (idempotente): trilha de auditoria
-- Registra quem criou, editou ou excluiu cada evento, notícia, unidade ou usuário,
-- e quando. Relevante para governança e para conformidade com a LGPD, já que o
-- sistema trata dados pessoais (e-mail, nome) associados à Secretaria de Saúde.
-- O registro fica guardado mesmo que o item original seja excluído depois — é
-- justamente aí que a trilha de auditoria importa mais.
-- Pode ser rodada novamente sem erro caso a tabela/políticas já existam.
-- ==========================================
CREATE TABLE IF NOT EXISTS public.auditoria (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES auth.users(id),
    usuario_email TEXT,
    acao TEXT NOT NULL CHECK (acao IN ('criar', 'editar', 'excluir')),
    entidade TEXT NOT NULL CHECK (entidade IN ('evento', 'noticia', 'unidade', 'usuario', 'importacao_unidades')),
    entidade_id UUID,
    entidade_titulo TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Apenas ADM pode visualizar a trilha completa (governança/LGPD).
DROP POLICY IF EXISTS "Leitura de auditoria restrita a ADM" ON public.auditoria;
CREATE POLICY "Leitura de auditoria restrita a ADM"
ON public.auditoria FOR SELECT
USING (public.get_user_role() = 'adm');

-- Qualquer usuário autenticado (adm ou saude) pode registrar uma ação, mas somente
-- em nome de si mesmo — nunca atribuindo a ação a outro usuário.
DROP POLICY IF EXISTS "Insercao de auditoria pelo proprio usuario autenticado" ON public.auditoria;
CREATE POLICY "Insercao de auditoria pelo proprio usuario autenticado"
ON public.auditoria FOR INSERT
WITH CHECK (auth.uid() = usuario_id AND public.get_user_role() IN ('adm', 'saude'));
