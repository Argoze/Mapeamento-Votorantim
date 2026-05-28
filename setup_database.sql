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
INSERT INTO public.unidades (nome, endereco, lat, lng) VALUES 
('UBS Vila Nova', 'Av. Pedro Augusto Rangel, 1925, Vila Nova', -23.5385391, -47.4156902),
('UBS Vila Garcia', 'Av. Izabel Ferreira Coelho, 271, Vila Garcia', -23.5512, -47.432),
('UBS Rio Acima', 'Av. Octávio Augusto Rangel, 1282, Jardim Toledo', -23.5277651, -47.4402925),
('UBS Barra Funda', 'Rua Lopes Chaves, S/N, Barra Funda', -23.5461177, -47.4383105),
('UBS Bela Vista', 'Av. São João, 867, Centro', -23.535, -47.442),
('Hospital Municipal', 'Rua João Walter, 181, Centro', -23.538, -47.445),
('UPA Central', 'Rua Antônio Walter, 66-146, Centro', -23.5375, -47.446),
('UBS Clarice', 'Rua Mercedes Nardi Arcuri, S/N, Jardim Clarice', -23.5532, -47.4411),
('UBS Itapeva', 'Rua João Santiago Figueira, 200, Jardim Itapeva', -23.5655, -47.438),
('UBS Novo Mundo', 'Rua Abílio Maia, 46, Jardim Novo Mundo', -23.5388857, -47.5039672),
('UBS Archila', 'Rua Lázara Bueno de Arruda, Jardim Archila', -23.5415, -47.4522),
('ESF Promorar', 'Rua Boaventura Maganhato, 138, São Matheus', -23.546, -47.441),
('ESF Cristal', 'Rua Anália Pereira, 762, Jardim Cristal', -23.5781298, -47.4694753),
('ESF Tatiana', 'Rua Adriano Maciel de Queiroz, 569, Jardim Tatiana', -23.544726, -47.4967263),
('ESF São João', 'Rua Zilda Tescaro Sbrana, Parque São João', -23.55, -47.42),
('ESF Green Valley', 'Rua José Raimundo da Silva, Green Valley', -23.558164, -47.4899802),
('ESF Amorim', 'Rua José Antônio de Mello, 81, Vila Amorim', -23.5560867, -47.4434317),
('UBS Serrano', 'Rua Francisco Lopes de Almeida, 76, Jardim Palmira', -23.5605, -47.4541);
