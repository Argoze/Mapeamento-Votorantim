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

// "ban_duration" não aceita um valor que signifique "para sempre" diretamente
// uusando uma duração bem longa (100 anos) pra representar desativação até alguém reativar manualmente.
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

        const ACOES_VALIDAS = ['list', 'set_status', 'delete', 'update_email', 'set_password'];
        if (!action || !ACOES_VALIDAS.includes(action)) {
            return json({ error: `Ação inválida. Use uma de: ${ACOES_VALIDAS.join(', ')}.` }, 400);
        }

        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        if (action === 'list') {
            const { data: perfis, error: perfisError } = await adminClient
                .from('perfis')
                .select('id, role, nome, permissoes');

            if (perfisError) {
                return json({ error: 'Erro ao buscar perfis: ' + perfisError.message }, 500);
            }

            // percorre todas as páginas pra garantir que nenhum usuário fique de fora.
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
                    permissoes: perfil?.permissoes || null,
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
            return json({ error: 'Você não pode alterar, desativar ou excluir a própria conta por aqui.' }, 400);
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

        // E-mail e senha vivem em auth.users — só a Service Role Key (usada só aqui,
        // nunca no frontend) pode alterá-los. Nome/papel/permissões, por outro lado,
        // ficam na tabela `perfis` e o próprio frontend já atualiza isso direto (RLS
        // libera qualquer ADM pra gerenciar `perfis`), sem precisar desta função.
        if (action === 'update_email') {
            const email = typeof body?.email === 'string' ? body.email.trim() : '';
            if (!email) {
                return json({ error: 'Campo obrigatório: email.' }, 400);
            }
            const { error: updateError } = await adminClient.auth.admin.updateUserById(targetId, {
                email,
                email_confirm: true, // evita exigir confirmação por e-mail (limite do plano gratuito)
            });
            if (updateError) {
                return json({ error: 'Erro ao atualizar e-mail: ' + updateError.message }, 400);
            }
            return json({ ok: true }, 200);
        }

        if (action === 'set_password') {
            const password = typeof body?.password === 'string' ? body.password : '';
            if (password.length < 6) {
                return json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, 400);
            }
            const { error: updateError } = await adminClient.auth.admin.updateUserById(targetId, { password });
            if (updateError) {
                return json({ error: 'Erro ao definir nova senha: ' + updateError.message }, 400);
            }
            return json({ ok: true }, 200);
        }

        if (action === 'delete') {
            // Várias tabelas guardam quem criou/registrou algo com uma foreign key pra
            // auth.users (sem ON DELETE CASCADE, que é o padrão do Postgres quando a
            // constraint não diz nada) — excluir o usuário no Auth enquanto essas linhas
            // ainda apontam pra ele falha com "Database error deleting user". A correção
            // é desvincular essas referências ANTES de tocar em auth.users, preservando o
            // conteúdo em si (eventos/notícias continuam publicados, e o histórico de
            // auditoria continua existindo com o e-mail já salvo em `usuario_email`) —
            // só o vínculo com a conta que será excluída é removido.
            //
            // Nenhum desses `update` tem seu erro checado de propósito: se alguma dessas
            // tabelas ainda não existir no banco (ex.: `auditoria`, que é uma atualização
            // opcional em setup_database.sql), isso não deve impedir a exclusão do usuário.
            await adminClient.from('eventos').update({ criado_por: null }).eq('criado_por', targetId);
            await adminClient.from('noticias').update({ criado_por: null }).eq('criado_por', targetId);
            await adminClient.from('auditoria').update({ usuario_id: null }).eq('usuario_id', targetId);

            // A linha de `perfis` também referencia auth.users(id) (sem CASCADE) — por
            // isso ela precisa ser apagada ANTES do usuário em auth.users, nunca depois
            // (como estava antes desta correção): na ordem antiga, o Postgres recusava
            // excluir o usuário enquanto o perfil dele ainda existisse.
            const { error: deletePerfilError } = await adminClient.from('perfis').delete().eq('id', targetId);
            if (deletePerfilError) {
                return json({ error: 'Erro ao excluir perfil: ' + deletePerfilError.message }, 400);
            }

            const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetId);
            if (deleteError) {
                return json({ error: 'Erro ao excluir usuário: ' + deleteError.message }, 400);
            }
            return json({ ok: true }, 200);
        }

        return json({ error: 'Ação não implementada.' }, 400);
    } catch (err) {
        console.error('Edge Function manage-user error:', err);
        const message = err instanceof Error ? err.message : 'Erro interno.';
        return json({ error: message }, 500);
    }
});