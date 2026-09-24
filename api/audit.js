import supabase from './db-client.js';
import { audit, cors, isOptions, requireUser } from './guard.js';
export default async function handler(req, res) {
  cors(res); if (isOptions(req, res)) return;
  try {
    const principal = await requireUser(req, res); if (!principal) return;
    if (req.method === 'GET') {
      if (!['Administrador', 'Gestor LGRP'].includes(principal.profile.role)) return res.status(403).json({ error: 'Acesso à auditoria reservado ao Gestor LGRP e Administrador.' });
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500); if (error) throw error; return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const { action, entity, entity_id, details } = req.body || {}; if (!action || !entity) return res.status(400).json({ error: 'Ação e entidade são obrigatórias.' });
      await audit(supabase, principal, action, entity, entity_id, details || {}); return res.status(201).json({ ok: true });
    }
    res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) { console.error('audit API error:', err); res.status(500).json({ error: err.message || 'Erro interno.' }); }
}
