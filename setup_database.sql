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

-- ==========================================
-- ATUALIZAÇÃO (idempotente): categoria do local + locais públicos além da Saúde
-- Generaliza a tabela "unidades" (que só guardava UBS/ESF/Hospital/UPA) para
-- guardar qualquer local público de Votorantim: Saúde, Educação, Cultura,
-- Governo, Lazer e Biblioteca — tudo no mesmo mapa, com filtro por categoria.
-- Registros existentes (as unidades de saúde já cadastradas) recebem
-- automaticamente categoria = 'Saúde' pelo DEFAULT abaixo, sem precisar de
-- nenhuma ação manual.
-- Pode ser rodada novamente sem erro caso a coluna já exista.
-- ==========================================
ALTER TABLE public.unidades ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'Saúde';

-- Escolas municipais (EMEF/EMEIEF/CMEI), secretarias, Prefeitura, Câmara Municipal,
-- Centro Cultural, Aquário Cultura, Museu, Auditório e o Parque do Matão.
-- Fonte: site oficial da Prefeitura de Votorantim (votorantim.sp.gov.br) e da
-- Câmara Municipal (votorantim.sp.leg.br), levantado em setembro/2026.
-- Coordenadas geocodificadas via OpenStreetMap/Nominatim — a marcação é o
-- ponto mapeado do endereço/bairro, então pode ter um desvio de algumas
-- dezenas a poucas centenas de metros em relação à entrada exata do prédio;
-- revise e ajuste pelo painel administrativo (editar unidade) sempre que
-- possível conferir o endereço exato "no local".
-- Este bloco NÃO é idempotente: rodar mais de uma vez duplica os registros.
-- Se precisar rodar de novo, apague antes as linhas já inseridas por ele
-- (ex.: DELETE FROM public.unidades WHERE categoria IN ('Educação','Cultura','Governo','Lazer','Biblioteca')).
INSERT INTO public.unidades (nome, endereco, categoria, lat, lng, telefone) VALUES
('Prefeitura de Votorantim (Paço Municipal)', 'Avenida 31 de Março, 327, Centro', 'Governo', -23.5408591, -47.4468843, NULL),
('Câmara Municipal de Votorantim', 'Boulevard Antônio Festa, 88, Centro', 'Governo', -23.5403558, -47.4466548, '(15) 3353-7300'),
('Secretaria de Cultura e Turismo', 'Avenida São João, 649, Jardim Icatu', 'Governo', -23.5404498, -47.4511201, NULL),
('Secretaria de Educação', 'Avenida Santo Antônio, 562, Barra Funda', 'Governo', -23.548615, -47.4340126, NULL),
('Secretaria de Esportes', 'Rua João Alarcon, 50, Jardim Icatu', 'Governo', -23.5414319, -47.4453976, NULL),
('Secretaria de Meio Ambiente', 'Rua Angelo Delapasi, 117, Parque Bela Vista', 'Governo', -23.5459698, -47.4627163, NULL),
('Secretaria de Saúde (sede administrativa)', 'Rua Pedro Fontes, 550, Rio Acima', 'Governo', -23.5379984, -47.4359864, NULL),
('Secretaria de Serviços Públicos', 'Avenida Moacir Oséias Guitte, Centro', 'Governo', -23.5379719, -47.4471433, NULL),
('Centro Cultural Mathias Gianolla', 'Boulevard Antônio Festa, 59, Centro', 'Cultura', -23.5379719, -47.4471433, '(15) 3353-8564'),
('Biblioteca Municipal de Votorantim (posto no Aquário Cultura)', 'Avenida Moacir Oséias Guitte, 41, Centro', 'Biblioteca', -23.5400318, -47.4471409, '(15) 3353-8669'),
('Aquário Cultura Claudir Calixto Mainardi', 'Avenida Moacir Oséias Guitte, 41, Centro', 'Cultura', -23.5379719, -47.4471433, '(15) 3353-8669'),
('Museu Histórico de Votorantim', 'Rua Joaquim Fogaça, 82, Vila Dominguinho', 'Cultura', -23.5429002, -47.4384852, '(15) 3243-1191'),
('Auditório Municipal Francisco Beranger', 'Avenida Vereador Newton Vieira Soares, 291, Centro', 'Cultura', -23.5379719, -47.4471433, '(15) 3243-0471'),
('Parque do Matão Jonas Domingues', 'Rua Angelo Delapasi, 117, Parque Bela Vista', 'Lazer', -23.5459698, -47.4627163, '(15) 3343-4076'),
('EMEF Professor Abimael Carlos de Campos', 'Avenida Luiz do Patrocínio Fernandes, 631, Dominguinho', 'Educação', -23.540442, -47.4382732, NULL),
('EMEF Professora Dides Crispim de Almeida Antônio', 'Rua Mário Nieri, 144, Vila Garcia', 'Educação', -23.5302864, -47.4300754, NULL),
('EMEF Izabel Ferreira Coelho', 'Rua José Gori, 120, Rio Acima', 'Educação', -23.5359545, -47.4354147, NULL),
('EMEF João Ferreira da Silva', 'Rua Angelo Bruno, 123, Itapeva', 'Educação', -23.5636279, -47.4491542, NULL),
('EMEF Professor Lauro Alves de Lima', 'Rua Caetano Corrêa da Silva, 33, Jardim Serrano', 'Educação', -23.5598371, -47.4556203, NULL),
('EMEF Maria Luiza Jacowicz', 'Rua Paschoal Jerônimo Fornazari, 465, Fornazari', 'Educação', -23.5486668, -47.4224656, NULL),
('EMEF Maria do Rosário Arcuri de Oliveira Campos', 'Rua Pedro Nunes, 407, Jardim Serrano II', 'Educação', -23.5643353, -47.4567032, NULL),
('EMEF Professora Mercedes Santucci', 'Rua Pedro Ferreira de Souza, Novo Mundo', 'Educação', -23.5399155, -47.5018788, NULL),
('EMEF Professor Oscar Bento Mariano', 'Rua Anésio Pereira do Nascimento, 123, Jardim Tatiana', 'Educação', -23.5427934, -47.4910215, NULL),
('EMEF Sueli da Silva Paula', 'Rua Laila Gallep Sacker, 25, Barra Funda', 'Educação', -23.5463794, -47.4377553, NULL),
('EMEF Professor Walter Rocha Camargo', 'Rua Odete Gori Bicudo, 800, Vila Nova', 'Educação', -23.5378835, -47.4152738, NULL),
('EMEIEF Gerson Soares de Arruda', 'Rua Mauro Almeida Barros, 57, Parque São João', 'Educação', -23.5713448, -47.4544953, NULL),
('EMEIEF Antônio Marciano', 'Rua Sete de Setembro, 803, Parque Bela Vista', 'Educação', -23.5437371, -47.4599227, NULL),
('EMEIEF Aurora Fontes', 'Rua Orlando Latance, 140, Vila Nova', 'Educação', -23.5376622, -47.41823, NULL),
('EMEIEF Professora Betty de Souza Oliveira', 'Avenida Santos Dumont, 1450, Vossoroca', 'Educação', -23.5479123, -47.4509888, NULL),
('EMEIEF Professor Cândido dos Santos', 'Rua Antônio Pereira de Almeida, 27, Green Valley', 'Educação', -23.5584043, -47.4906296, NULL),
('EMEIEF Professora Célia Pieroni', 'Rua Antônio Antunes de Assis, 35, Itapeva', 'Educação', -23.5636279, -47.4491542, NULL),
('EMEIEF Professora Edith Maganini', 'Rua João Carlos de Campos, 359, Vossoroca', 'Educação', -23.5479123, -47.4509888, NULL),
('EMEIEF Eugênia Maria da Silveira', 'Rua Anísio Pereira do Nascimento, Jardim Tatiana', 'Educação', -23.5423649, -47.4916524, NULL),
('EMEIEF Gilberto dos Santos', 'Rua Luís Frias, Parque Jataí II', 'Educação', -23.5713229, -47.4631258, NULL),
('EMEIEF Helena Pereira de Moraes', 'Avenida Vereador Newton Vieira Soares, 291, Centro', 'Educação', -23.5379719, -47.4471433, NULL),
('EMEIEF Izabel Fernandes Pedroso', 'Rua Lourenço Mouro, 60, Jardim São Lucas', 'Educação', -23.5823947, -47.4701919, NULL),
('EMEIEF Lucinda Rodrigues Pereira Ignácio', 'Rua Hortência Maciel de Camargo, 154, Parque Morumbi', 'Educação', -23.5390298, -47.4610506, NULL),
('EMEIEF Maria Helena de Moraes Scripilliti', 'Rua Eugênio Ildefonso, 111, Vila Votocel', 'Educação', -23.556119, -47.4426714, NULL),
('EMEIEF Professora Parizete Jordão Bressane', 'Rua Jackes Gonçalves, 154, Jardim Serrano II', 'Educação', -23.5598371, -47.4556203, NULL),
('EMEIEF Professora Patrícia Maria dos Santos', 'Rua Benedito Galero, 99, São Matheus', 'Educação', -23.5396615, -47.4081844, NULL),
('CMEI Célia Chiozotto Marinoni', 'Rua Joaquim Ferreira, 137, Rio Acima', 'Educação', -23.5382888, -47.4352219, NULL),
('CMEI Maria Aparecida Ferrato Camargo', 'Rua Manoel Vasques Pineda, 344, Fornazari', 'Educação', -23.5396364, -47.4238927, NULL),
('CMEI Raphaela Résio Cau', 'Rua Carlos Caldini, Vila Garcia', 'Educação', -23.5302864, -47.4300754, NULL),
('CMEI Romana Frederico Bauch', 'Rua José Paz Ribeiro, 81, Novo Mundo', 'Educação', -23.5395317, -47.5027832, NULL),
('CMEI Rosa Pereira', 'Rua Flávio Sampaio, 41, Promorar', 'Educação', -23.5365502, -47.4100611, NULL),
('CMEI Sueli Gazolli Campos', 'Rua Otávio Rodrigues, Jardim Serrano', 'Educação', -23.562694, -47.4547367, NULL),
('CMEI Alda Luchini Vial', 'Rua Isaac Mendes, 89, Ângelo Vial', 'Educação', -23.525561, -47.4444429, NULL),
('CMEI Carmela Guariglia Ramos', 'Rua Cantídio de Souza, 44, Vila Galli', 'Educação', -23.5635138, -47.4522156, NULL),
('CMEI Professora Cecília Fernanda Arcuri Pacheco', 'Rua Antônio Aparecido Ferraz, Jardim Tatiana', 'Educação', -23.5444712, -47.4969663, NULL),
('CMEI Professora Ester Agar Fonseca Félix', 'Rua Venizia dos Santos Albertoni, Jardim Ana Cláudia', 'Educação', -23.5330018, -47.4312153, NULL),
('CMEI Felippe Kalil', 'Rua Gumercindo Vieira Soares, Jardim São Luiz', 'Educação', -23.5310496, -47.4374351, NULL),
('CMEI Fernanda Rosa Bueno', 'Rua Benedito Lázaro, Jardim Maria José', 'Educação', -23.539023, -47.4645572, NULL),
('CMEI Professora Flávia Regina Leite do Canto Morrinho Viana', 'Rua Mercedes Nardi Arcuri, Jardim Clarice', 'Educação', -23.5510045, -47.464447, NULL),
('CMEI Francisco Rodrigues Benedito', 'Rua Mário Lázaro, Jardim Primavera', 'Educação', -23.5445336, -47.5062085, NULL),
('CMEI Geraldo Bernardino Santos', 'Rua Zacarias Monteiro de Souza, Jardim São Lucas', 'Educação', -23.5801496, -47.4694003, NULL),
('CMEI Professora Giselle Freitas Xavier', 'Rua Sérgio Sales, 10, Barra Funda', 'Educação', -23.5482025, -47.4353468, NULL),
('CMEI Ismael Pereira de Camargo', 'Rua Victório Zanchetta, 2, Promorar', 'Educação', -23.538331, -47.4107524, NULL),
('CMEI José Bernardo', 'Avenida Otaviano de Goes Vieira, 200, Parque São João', 'Educação', -23.5749018, -47.4538975, NULL),
('CMEI Judith Gazoli Carrara', 'Rua Amália Galam, 380, Vila Nova', 'Educação', -23.5378835, -47.4152738, NULL),
('CMEI Professora Marguerite Guerra', 'Rua Jesuíno da Costa, 34, Rio Acima', 'Educação', -23.5373697, -47.4356741, NULL),
('CMEI Maria José Silva Oliveira', 'Rua João Santiago Figueira, 172, Itapeva', 'Educação', -23.5636279, -47.4491542, NULL),
('CMEI Mercedes Nardi Arcuri', 'Rua Júlia Martins Domingues, 95, Vossoroca', 'Educação', -23.5479123, -47.4509888, NULL),
('CMEI Odair Cau', 'Avenida Isabel Ferreira Coelho, Vila Garcia', 'Educação', -23.5303613, -47.4296146, NULL),
('CMEI Teresa Esquitini', 'Rua José Raimundo da Silva, Green Valley', 'Educação', -23.5603528, -47.4919883, NULL),
('CMEI Virma Gali', 'Rua Antônio Telles, Jardim Toledo', 'Educação', -23.5291031, -47.4419235, NULL),
('CMEI Maria José de Oliveira Silva', 'Rua Mário Savella, Vila Nova', 'Educação', -23.5378162, -47.4187759, NULL),
('CMEI Olímpia Pozza Beber', 'Rua Victorino Zanchetta, 225, Promorar', 'Educação', -23.5384972, -47.4084417, NULL);

-- ==========================================
-- PENDENTE: os 8 locais abaixo NÃO entraram no INSERT acima porque não foi
-- possível confirmar a coordenada automaticamente (endereço não encontrado
-- no OpenStreetMap). Cadastre-os manualmente pelo painel administrativo
-- (Admin > Unidades), com a lat/lng exata do local:
--   - VOTOPREV - Fundação da Seguridade Social dos Servidores
--     (Avenida Philomena Lopes Vasques, 177, Jardim Archila) — Governo
--   - Secretaria de Cidadania e Geração de Renda
--     (Avenida Moacir Oséias Guitte, Jardim Paraíso) — Governo
--   - Parque Ecológico das Aves "Jhosely Lopes dos Santos" — Lazer
--   - EMEF Professor Antônio Vicente Bernardi
--     (Rua José Alarcon, 50, Jardim Archila) — Educação
--   - CMEI Carmela de Paula Cipullo
--     (Avenida Octávio Augusto Rangel, 360, Curtume) — Educação
--   - CMEI Antônia do Rosário Santos
--     (Rua Renato Araújo, 59, Jardim Araújo) — Educação
--   - CMEI Clélia Carrara
--     (Rua João André Filho, Real Parque) — Educação
--   - CMEI Tomaz Mobile Neto
--     (Rua Oscarlina Tegami, 2101, Jardim Simone) — Educação
-- ==========================================
