import supabase from './db-client.js';
export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
export async function requireUser(req, res, allowed = []) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Autenticação necessária.' }); return null; }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) { res.status(401).json({ error: 'Sessão inválida ou expirada.' }); return null; }
  let { data: profile, error: profileError } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (profileError) throw profileError;
  if (!profile) {
    const { data: created, error: createError } = await supabase.from('user_profiles').insert({ user_id: user.id, email: user.email, full_name: user.user_metadata?.full_name || user.user_metadata?.name || '', role: 'Consulta', password_hash: '' }).select('*').single();
    if (createError) {
      const { data: existing, error: retryError } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (retryError || !existing) throw createError;
      profile = existing;
    } else profile = created;
  }
  if (allowed.length && !allowed.includes(profile.role)) { res.status(403).json({ error: 'Seu perfil não tem permissão para esta operação.' }); return null; }
  const { password_hash: _passwordHash, ...safeProfile } = profile;
  return { user, profile: safeProfile };
}
export async function audit(supabaseClient, principal, action, entity, entityId, details = {}) {
  const { error } = await supabaseClient.from('audit_logs').insert({ actor: principal.profile.full_name || principal.user.email, actor_email: principal.user.email, role: principal.profile.role, action, entity, entity_id: String(entityId ?? ''), details });
  if (error) throw error;
}
export function isOptions(req, res) { if (req.method === 'OPTIONS') { res.status(204).end(); return true; } return false; }
