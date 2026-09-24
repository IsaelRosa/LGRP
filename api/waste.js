import supabase from './db-client.js';
import { audit, cors, isOptions, requireUser } from './guard.js';
export default async function handler(req, res) {
  cors(res); if (isOptions(req, res)) return;
  try {
    const principal = await requireUser(req, res); if (!principal) return;
    if (req.method === 'GET') { const { data, error } = await supabase.from('wastes').select('*').order('generated_at', { ascending: false }); if (error) throw error; return res.status(200).json(data); }
    if (req.method === 'POST' || req.method === 'PUT') {
      if (!['Administrador', 'Gestor LGRP', 'Operacional', 'Laboratório'].includes(principal.profile.role)) return res.status(403).json({ error: 'Seu perfil não pode alterar resíduos.' });
      const b = req.body || {}; if (!b.name || !b.lab_name || !Number(b.quantity) || !b.hazard_class) return res.status(400).json({ error: 'Nome, laboratório, quantidade e classe de risco são obrigatórios.' });
      if (req.method === 'POST') {
        const code = `RES-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
        const { data, error } = await supabase.from('wastes').insert({ code, name: b.name, composition: b.composition || '', lab_name: b.lab_name, hazard_class: b.hazard_class, physical_state: b.physical_state || 'Não informado', quantity: Number(b.quantity), unit: b.unit || 'kg', status: b.status || 'Gerado', storage_location: b.storage_location || '', container_code: b.container_code || '', notes: b.notes || '', generated_at: new Date().toISOString(), created_by: principal.user.id, request_id: b.request_id || null }).select('*').single();
        if (error) throw error; await audit(supabase, principal, 'RESIDUO_CRIADO', 'waste', data.id, { code: data.code, lab_name: data.lab_name }); return res.status(201).json(data);
      }
      if (!b.id) return res.status(400).json({ error: 'Identificador do resíduo obrigatório.' });
      const patch = {}; for (const key of ['name', 'composition', 'lab_name', 'hazard_class', 'physical_state', 'status', 'storage_location', 'container_code', 'notes', 'unit']) if (b[key] !== undefined) patch[key] = b[key]; if (b.quantity !== undefined) patch.quantity = Number(b.quantity);
      patch.updated_at = new Date().toISOString(); const { data, error } = await supabase.from('wastes').update(patch).eq('id', b.id).select('*').single(); if (error) throw error;
      await audit(supabase, principal, 'RESIDUO_ATUALIZADO', 'waste', b.id, patch); return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) { console.error('waste API error:', err); res.status(500).json({ error: err.message || 'Erro interno.' }); }
}
