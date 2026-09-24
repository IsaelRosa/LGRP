import supabase from './db-client.js';
import { audit, cors, isOptions, requireUser } from './guard.js';
const roles = ['Administrador', 'Gestor LGRP', 'Operacional'];
export default async function handler(req, res) {
  cors(res); if (isOptions(req, res)) return;
  try {
    const principal = await requireUser(req, res); if (!principal) return;
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('operations').select('*, wastes(code,name,lab_name)').order('occurred_at', { ascending: false }); if (error) throw error;
      return res.status(200).json((data || []).map(row => ({ ...row, waste_code: row.wastes?.code, waste_name: row.wastes?.name })));
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    if (!roles.includes(principal.profile.role)) return res.status(403).json({ error: 'Operação reservada aos perfis Operacional, Gestor LGRP ou Administrador.' });
    const b = req.body || {}; if (!b.waste_id || !['Coleta', 'Pesagem', 'Tratamento', 'Recuperação', 'Redução', 'Destinação'].includes(b.action)) return res.status(400).json({ error: 'Tipo de operação e resíduo são obrigatórios.' });
    const { data: waste, error: wasteError } = await supabase.from('wastes').select('*').eq('id', b.waste_id).single(); if (wasteError) throw wasteError;
    const gross = Number(b.gross_weight || 0), tare = Number(b.tare_weight || 0); let net = Number(b.net_weight || 0); if (!net && gross > tare) net = Number((gross - tare).toFixed(3));
    const payload = { waste_id: waste.id, action: b.action, gross_weight: gross, tare_weight: tare, net_weight: net, operator: b.operator || principal.profile.full_name || principal.user.email, occurred_at: new Date().toISOString(), notes: b.notes || '', method: b.method || '', outcome: b.outcome || '', destination: b.destination || '', manifest: b.manifest || '', container_code: b.container_code || '' };
    const { data, error } = await supabase.from('operations').insert(payload).select('*').single(); if (error) throw error;
    const nextStatus = { Coleta: 'Em armazenamento', Pesagem: waste.status, Tratamento: 'Tratado', Recuperação: 'Recuperado', Redução: 'Tratado', Destinação: 'Destinado' }[b.action];
    const updates = { status: nextStatus, updated_at: new Date().toISOString() }; if (b.action === 'Coleta' && net) { updates.quantity = net; updates.unit = 'kg'; } if (b.action === 'Coleta' && b.container_code) updates.container_code = b.container_code;
    const { error: updateError } = await supabase.from('wastes').update(updates).eq('id', waste.id); if (updateError) throw updateError;
    if (b.request_id && b.action === 'Coleta') { const { error: requestError } = await supabase.from('waste_requests').update({ status: 'Coletada' }).eq('id', b.request_id); if (requestError) throw requestError; }
    await audit(supabase, principal, `${b.action.toUpperCase()}_REGISTRADA`, 'waste', waste.id, { operation_id: data.id, code: waste.code, net_weight: net, method: b.method, destination: b.destination });
    return res.status(201).json({ ...data, waste_code: waste.code, waste_name: waste.name });
  } catch (err) { console.error('operations API error:', err); res.status(500).json({ error: err.message || 'Erro interno.' }); }
}
