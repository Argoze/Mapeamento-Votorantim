// Supabase Edge Function: create-user
//
// Cria um novo usuário (papel "saude" ou "adm") sem expor a Service Role Key no
// bundle do frontend. Só quem já está autenticado como "adm" consegue usar esta
// função — a checagem é feita aqui, no servidor, antes de tocar na Service Role Key.
//
// Deploy:
//   supabase functions deploy create-user
//
// Secret necessário (NUNCA prefixar com VITE_, para não vazar para o frontend):
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<sua_service_role_key>
//
// SUPABASE_URL e SUPABASE_ANON_KEY já ficam disponíveis automaticamente dentro do
// ambiente de execução de qualquer Edge Function do projeto.

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
      console.error('Edge Function create-user: variáveis de ambiente ausentes.');
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
      return json({ error: 'Apenas administradores podem criar novos usuários.' }, 403);
    }

    const body = await req.json().catch(() => null);
    const email = body?.email;
    const password = body?.password;
    const role = body?.role;
    const nome = body?.nome ?? null;

    if (!email || !password || !role) {
      return json({ error: 'Campos obrigatórios: email, password e role.' }, 400);
    }
    if (!['adm', 'saude'].includes(role)) {
      return json({ error: 'Papel (role) inválido. Use "adm" ou "saude".' }, 400);
    }
    if (String(password).length < 6) {
      return json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, 400);
    }

    // Só agora, já confirmado que quem chamou é admin, criamos um cliente com a
    // Service Role Key — que existe apenas neste ambiente de servidor.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // evita o e-mail de confirmação (limite do plano gratuito)
    });

    if (createError) {
      return json({ error: createError.message }, 400);
    }
    if (!created?.user) {
      return json({ error: 'Erro desconhecido ao criar usuário.' }, 500);
    }

    const { error: insertProfileError } = await adminClient.from('perfis').insert({
      id: created.user.id,
      role,
      nome,
    });

    if (insertProfileError) {
      return json({
        error: 'Usuário criado no sistema, mas não foi possível vincular o perfil: ' + insertProfileError.message,
      }, 500);
    }

    return json({ user: created.user }, 200);
  } catch (err) {
    console.error('Edge Function create-user error:', err);
    const message = err instanceof Error ? err.message : 'Erro interno.';
    return json({ error: message }, 500);
  }
});
