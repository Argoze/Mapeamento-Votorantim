-- ==========================================================
-- SCRIPT DE CORREÇÃO DO BANCO (RLS E USUÁRIOS)
-- ==========================================================

-- 1. Cria função segura para ler o perfil sem causar "loop infinito" (Recursion)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = public
STABLE AS $$
  SELECT role FROM public.perfis WHERE id = auth.uid();
$$;

-- 2. Apaga as políticas antigas que estavam em loop
DROP POLICY IF EXISTS "Gerenciamento de unidades restrito" ON public.unidades;
DROP POLICY IF EXISTS "Gerenciamento de eventos restrito" ON public.eventos;
DROP POLICY IF EXISTS "Gerenciamento de perfis por ADM" ON public.perfis;

-- 3. Recria as políticas usando a função segura
CREATE POLICY "Gerenciamento de unidades restrito" 
ON public.unidades FOR ALL 
USING (public.get_user_role() IN ('adm', 'saude'));

CREATE POLICY "Gerenciamento de eventos restrito" 
ON public.eventos FOR ALL 
USING (public.get_user_role() IN ('adm', 'saude'));

CREATE POLICY "Gerenciamento de perfis por ADM" 
ON public.perfis FOR ALL 
USING (public.get_user_role() = 'adm');

-- ==========================================================
-- CRIAÇÃO DE USUÁRIOS DE TESTE
-- ==========================================================
-- Cria ADM (se não existir)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
)
SELECT 
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@votorantim.sp.gov.br', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', false
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@votorantim.sp.gov.br');

-- Cria SAUDE (se não existir)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin
)
SELECT 
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'saude@votorantim.sp.gov.br', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', false
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'saude@votorantim.sp.gov.br');

-- Vincula os perfis
INSERT INTO public.perfis (id, role, nome)
SELECT id, 'adm', 'Administrador Chefe' FROM auth.users WHERE email = 'admin@votorantim.sp.gov.br'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.perfis (id, role, nome)
SELECT id, 'saude', 'Profissional de Saúde' FROM auth.users WHERE email = 'saude@votorantim.sp.gov.br'
ON CONFLICT (id) DO NOTHING;
