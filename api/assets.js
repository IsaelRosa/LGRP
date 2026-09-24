import supabase from './db-client.js';
import { audit, cors, isOptions, requireUser } from './guard.js';
const tableByType = { containers: 'containers', reagents: 'reagents' };
export default async function handler(req, res) {
  cors(res); if (isOptions(req, res)) return;
  try {
    const principal = await requireUser(req, res); if (!principal) return;
    const type = req.method === 'GET' ? req.query.type : req.body?.asset_type;
    const table = tableByType[type]; if (!table) return res.status(400).json({ error: 'Tipo de ativo inválido.' });
    if (req.method === 'GET') { const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false }); if (error) throw error; return res.status(200).json(data); }
    if (!['Administrador', 'Gestor LGRP', 'Operacional'].includes(principal.profile.role)) return res.status(403).json({ error: 'Seu perfil não pode gerenciar ativos.' });
    const b = req.body || {};
    if (req.method === 'POST') {
      if (type === 'containers' && !b.type) return res.status(400).json({ error: 'Tipo do recipiente é obrigatório.' });
      if (type === 'reagents' && !b.name) return res.status(400).json({ error: 'Nome do reagente é obrigatório.' });
      const code = `${type === 'containers' ? 'REC' : 'REA'}-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
      const base = type === 'containers' ? { code, type: b.type, material: b.material || '', capacity: Number(b.capacity || 0), unit: b.unit || 'L', status: b.status || 'Disponível', location: b.location || '', assigned_lab: b.assigned_lab || '', expiry_date: b.expiry_date || null } : { code, name: b.name, cas_number: b.cas_number || '', lab_name: b.lab_name || '', quantity: Number(b.quantity || 0), unit: b.unit || 'un', expiry_date: b.expiry_date || null, status: b.status || 'Estoque', location: b.location || '' };
      const { data, error } = await supabase.from(table).insert(base).select('*').single(); if (error) throw error;
      await audit(supabase, principal, `${type === 'containers' ? 'RECIPIENTE' : 'REAGENTE'}_CRIADO`, type, data.id, { code }); return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      if (!b.id) return res.status(400).json({ error: 'Identificador obrigatório.' });
      const allowed = type === 'containers' ? ['type', 'material', 'capacity', 'unit', 'status', 'location', 'assigned_lab', 'expiry_date'] : ['name', 'cas_number', 'lab_name', 'quantity', 'unit', 'expiry_date', 'status', 'location'];
      const patch = {}; for (const key of allowed) if (b[key] !== undefined) patch[key] = key === 'expiry_date' && b[key] === '' ? null : b[key]; patch.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from(table).update(patch).eq('id', b.id).select('*').single(); if (error) throw error;
      await audit(supabase, principal, `${type.toUpperCase()}_ATUALIZADO`, type, b.id, patch); return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) { console.error('assets API error:', err); res.status(500).json({ error: err.message || 'Erro interno.' }); }
}
