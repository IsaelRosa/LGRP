import supabase from './db-client.js';
import { audit, cors, isOptions, requireUser } from './guard.js';
const managers = ['Administrador', 'Gestor LGRP'];
export default async function handler(req, res) {
  cors(res); if (isOptions(req, res)) return;
  try {
    const principal = await requireUser(req, res); if (!principal) return;
    if (req.method === 'GET') { const { data, error } = await supabase.from('waste_requests').select('*').order('requested_at', { ascending: false }); if (error) throw error; return res.status(200).json(data); }
    if (req.method === 'POST') {
      if (!['Administrador', 'Gestor LGRP', 'Operacional', 'Laboratório'].includes(principal.profile.role)) return res.status(403).json({ error: 'Seu perfil não pode abrir solicitações.' });
      const b = req.body || {};
      if (!b.lab_name || !b.description || !Number(b.quantity) || !b.hazard_class) return res.status(400).json({ error: 'Laboratório, descrição, quantidade e classe de risco são obrigatórios.' });
      const code = `SOL-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
      const { data, error } = await supabase.from('waste_requests').insert({ code, lab_name: b.lab_name, requester: b.requester || principal.profile.full_name || principal.user.email, description: b.description, hazard_class: b.hazard_class, physical_state: b.physical_state || 'Não informado', quantity: Number(b.quantity), unit: b.unit || 'kg', notes: b.notes || '', status: 'Recebida', requested_at: new Date().toISOString(), created_by: principal.user.id }).select('*').single();
      if (error) throw error; await audit(supabase, principal, 'SOLICITACAO_CRIADA', 'waste_request', data.id, { code: data.code, lab_name: data.lab_name }); return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      if (!['Administrador', 'Gestor LGRP', 'Operacional'].includes(principal.profile.role)) return res.status(403).json({ error: 'Seu perfil não pode atualizar solicitações.' });
      const { id, status, scheduled_at, container_code } = req.body || {}; if (!id) return res.status(400).json({ error: 'Identificador da solicitação obrigatório.' });
      if (status === 'Aprovada' && !managers.includes(principal.profile.role)) return res.status(403).json({ error: 'A aprovação exige perfil Gestor LGRP ou Administrador.' });
      let assignedContainer = null;
      if (container_code) {
        const { data: container, error: containerError } = await supabase.from('containers').select('*').eq('code', container_code).maybeSingle();
        if (containerError) throw containerError;
        if (!container) return res.status(400).json({ error: 'Recipiente não cadastrado. Registre o ativo antes de programar a entrega.' });
        if (container.status !== 'Disponível' && container.status !== 'Em uso') return res.status(409).json({ error: 'Recipiente indisponível para atribuição.' });
        assignedContainer = container;
      }
      const patch = {}; if (status) patch.status = status; if (scheduled_at) { patch.scheduled_at = scheduled_at; patch.status = 'Agendada'; } if (container_code) patch.container_code = container_code;
      const { data, error } = await supabase.from('waste_requests').update(patch).eq('id', id).select('*').single(); if (error) throw error;
      if (assignedContainer) {
        const { error: containerUpdateError } = await supabase.from('containers').update({ status: 'Em uso', assigned_lab: data.lab_name, updated_at: new Date().toISOString() }).eq('id', assignedContainer.id);
        if (containerUpdateError) throw containerUpdateError;
        await audit(supabase, principal, 'RECIPIENTE_ENTREGUE', 'container', assignedContainer.id, { code: assignedContainer.code, request_code: data.code, assigned_lab: data.lab_name });
      }
      await audit(supabase, principal, `SOLICITACAO_${String(data.status).toUpperCase()}`, 'waste_request', id, patch); return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) { console.error('requests API error:', err); res.status(500).json({ error: err.message || 'Erro interno.' }); }
}
