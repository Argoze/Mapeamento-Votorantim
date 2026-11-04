// Supabase Edge Function: manage-user
//
// Gestão de contas de usuário do /admin (além da criação, já resolvida pela
// função "create-user"): listar usuários (com dados que só existem em
// auth.users, inacessível ao cliente), ativar/desativar temporariamente
// (ban/unban nativo do Supabase Auth) e excluir permanentemente.
//
// Só quem já está autenticado como "adm" consegue usar esta função — a
// checagem é feita aqui, no servidor, antes de tocar na Service Role Key,
// seguindo exatamente o mesmo padrão de "create-user".
//
// Deploy:
//   supabase functions deploy manage-user
//
// Secret necessário (já deve estar configurado, é o mesmo usado por create-user):
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<sua_service_role_key>

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

// "ban_duration" não aceita um valor que signifique "para sempre" diretamente,
// então usamos uma duração bem longa (100 anos) pra representar desativação
// até alguém reativar manualmente.
const BAN_DURATION_DESATIVADO = '876000h';

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return json({ error: 'Não autenticado.' }, 401);
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !anonKey || !serviceRoleKey) {
            console.error('Edge Function manage-user: variáveis de ambiente ausentes.');
            return json({ error: 'Função mal configurada no servidor. Contate o suporte técnico.' }, 500);
        }

        // Cliente "como o chamador" — só para descobrir quem está chamando e checar o papel dele.
        // Nenhuma ação sensível é feita com este cliente.
        const callerClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
        if (callerError || !callerUser) {
            return json({ error: 'Sessão inválida ou expirada.' }, 401);
        }

        const { data: callerProfile, error: profileError } = await callerClient
            .from('perfis')
            .select('role')
            .eq('id', callerUser.id)
            .single();

        if (profileError || !callerProfile || callerProfile.role !== 'adm') {
            return json({ error: 'Apenas administradores podem gerenciar usuários.' }, 403);
        }

        const body = await req.json().catch(() => null);
        const action = body?.action;

        if (!action || !['list', 'set_status', 'delete'].includes(action)) {
            return json({ error: 'Ação inválida. Use "list", "set_status" ou "delete".' }, 400);
        }

        // Só agora, já confirmado que quem chamou é admin, criamos um cliente com a
        // Service Role Key — que existe apenas neste ambiente de servidor.
        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        if (action === 'list') {
            const { data: perfis, error: perfisError } = await adminClient
                .from('perfis')
                .select('id, role, nome');

            if (perfisError) {
                return json({ error: 'Erro ao buscar perfis: ' + perfisError.message }, 500);
            }

            // auth.admin.listUsers() é paginado (padrão: 50 por página) — percorre
            // todas as páginas pra garantir que nenhum usuário fique de fora.
            const usuariosAuth: Record<string, unknown>[] = [];
            let page = 1;
            const perPage = 200;
            while (true) {
                const { data: pageData, error: listError } = await adminClient.auth.admin.listUsers({ page, perPage });
                if (listError) {
                    return json({ error: 'Erro ao listar usuários: ' + listError.message }, 500);
                }
                usuariosAuth.push(...pageData.users);
                if (pageData.users.length < perPage) break;
                page += 1;
            }

            const perfisPorId = new Map((perfis || []).map((p) => [p.id, p]));

            const usuarios = usuariosAuth.map((u) => {
                const perfil = perfisPorId.get(u.id as string);
                const bannedUntil = u.banned_until as string | null | undefined;
                const desativado = !!bannedUntil && new Date(bannedUntil).getTime() > Date.now();
                return {
                    id: u.id,
                    email: u.email,
                    nome: perfil?.nome || null,
                    role: perfil?.role || null,
                    desativado,
                    criado_em: u.created_at,
                    ultimo_acesso: u.last_sign_in_at || null,
                };
            });

            usuarios.sort((a, b) => (a.nome || a.email || '').localeCompare(b.nome || b.email || ''));

            return json({ users: usuarios }, 200);
        }

        const targetId = body?.id;
        if (!targetId) {
            return json({ error: 'Campo obrigatório: id.' }, 400);
        }
        if (targetId === callerUser.id) {
            return json({ error: 'Você não pode desativar ou excluir a própria conta.' }, 400);
        }

        if (action === 'set_status') {
            const desativar = !!body?.desativar;
            const { error: updateError } = await adminClient.auth.admin.updateUserById(targetId, {
                ban_duration: desativar ? BAN_DURATION_DESATIVADO : 'none',
            });
            if (updateError) {
                return json({ error: 'Erro ao atualizar status: ' + updateError.message }, 400);
            }
            return json({ ok: true }, 200);
        }

        if (action === 'delete') {
            const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetId);
            if (deleteError) {
                return json({ error: 'Erro ao excluir usuário: ' + deleteError.message }, 400);
            }
            // A FK de perfis.id → auth.users.id costuma estar com ON DELETE CASCADE,
            // mas removemos explicitamente aqui também pra garantir, caso não esteja.
            await adminClient.from('perfis').delete().eq('id', targetId);
            return json({ ok: true }, 200);
        }

        return json({ error: 'Ação não implementada.' }, 400);
    } catch (err) {
        console.error('Edge Function manage-user error:', err);
        const message = err instanceof Error ? err.message : 'Erro interno.';
        return json({ error: message }, 500);
    }
});