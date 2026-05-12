-- ==============================================================================
-- SCRIPT PARA CRIAR USUÁRIOS DE TESTE (ADM E SAÚDE)
-- Copie este código, cole no SQL Editor do Supabase e clique em "Run"
-- ==============================================================================

-- 1. Cria o usuário Administrador
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    uuid_generate_v4(),
    'authenticated',
    'authenticated',
    'admin@votorantim.sp.gov.br',
    crypt('senha123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false
)
ON CONFLICT (email) DO NOTHING;

-- 2. Cria o usuário de Saúde
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    uuid_generate_v4(),
    'authenticated',
    'authenticated',
    'saude@votorantim.sp.gov.br',
    crypt('senha123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false
)
ON CONFLICT (email) DO NOTHING;

-- 3. Vincula os usuários aos seus respectivos perfis na tabela 'perfis'
INSERT INTO public.perfis (id, role, nome)
SELECT id, 'adm', 'Administrador Chefe'
FROM auth.users
WHERE email = 'admin@votorantim.sp.gov.br'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.perfis (id, role, nome)
SELECT id, 'saude', 'Profissional de Saúde'
FROM auth.users
WHERE email = 'saude@votorantim.sp.gov.br'
ON CONFLICT (id) DO NOTHING;

-- ATENÇÃO: As senhas para ambos os usuários é "senha123"
