import supabase from './db-client.js';
import { audit, cors, isOptions, requireUser } from './guard.js';
export default async function handler(req, res) {
  cors(res); if (isOptions(req, res)) return;
  try {
    const principal = await requireUser(req, res); if (!principal) return;
    if (req.method === 'GET') {
      if (req.query.all === 'true' && principal.profile.role === 'Administrador') {
        const { data, error } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
        if (error) throw error; return res.status(200).json((data || []).map(({ password_hash: _passwordHash, ...profile }) => profile));
      }
      return res.status(200).json(principal.profile);
    }
    if (req.method === 'PUT') {
      if (principal.profile.role !== 'Administrador') return res.status(403).json({ error: 'Somente Administradores podem alterar perfis.' });
      const { user_id, role } = req.body || {};
      const roles = ['Administrador', 'Gestor LGRP', 'Operacional', 'Laboratório', 'Consulta'];
      if (!user_id || !roles.includes(role)) return res.status(400).json({ error: 'Usuário ou perfil inválido.' });
      const { data, error } = await supabase.from('user_profiles').update({ role, updated_at: new Date().toISOString() }).eq('user_id', user_id).select('*').single();
      if (error) throw error;
      await audit(supabase, principal, 'PERFIL_ALTERADO', 'user_profile', user_id, { role });
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) { console.error('auth-profile API error:', err); res.status(500).json({ error: err.message || 'Erro interno.' }); }
}
