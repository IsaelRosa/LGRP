import supabase from './db-client.js';
import { audit, cors, isOptions, requireUser } from './guard.js';
export default async function handler(req, res) {
  cors(res); if (isOptions(req, res)) return;
  try {
    const principal = await requireUser(req, res); if (!principal) return;
    if (req.method === 'GET') {
      const [alertsResult, reagentsResult, containersResult] = await Promise.all([
        supabase.from('alerts').select('*').order('created_at', { ascending: false }),
        supabase.from('reagents').select('code,name,expiry_date,status'),
        supabase.from('containers').select('code,type,expiry_date,status')
      ]);
      for (const result of [alertsResult, reagentsResult, containersResult]) if (result.error) throw result.error;
      const existing = alertsResult.data || [];
      const candidates = [];
      const today = new Date();
      const soon = new Date(today.getTime() + 90 * 86400000);
      for (const reagent of reagentsResult.data || []) {
        if (!reagent.expiry_date) continue;
        const expiry = new Date(reagent.expiry_date);
        if (expiry <= soon) candidates.push({ type: 'validade', related_code: reagent.code, title: expiry < today ? 'Reagente vencido identificado' : 'Reagente próximo do vencimento', message: `${reagent.name} ${expiry < today ? 'está vencido' : 'vence em breve'}. Segregar, revisar o uso e programar destinação segura.`, severity: expiry < today ? 'critical' : 'warning' });
      }
      for (const container of containersResult.data || []) {
        if (!container.expiry_date) continue;
        const expiry = new Date(container.expiry_date);
        if (expiry <= soon) candidates.push({ type: 'recipiente', related_code: container.code, title: 'Inspeção de recipiente pendente', message: `${container.type} requer inspeção ou substituição até ${expiry.toLocaleDateString('pt-BR')}.`, severity: expiry < today ? 'critical' : 'warning' });
      }
      for (const candidate of candidates) {
        if (existing.some(item => item.related_code === candidate.related_code && item.title === candidate.title)) continue;
        const { data, error } = await supabase.from('alerts').insert(candidate).select('*').single();
        if (error) throw error;
        existing.unshift(data);
      }
      return res.status(200).json(existing);
    }
    if (req.method === 'PUT') {
      if (!['Administrador', 'Gestor LGRP', 'Operacional'].includes(principal.profile.role)) return res.status(403).json({ error: 'Seu perfil não pode resolver alertas.' });
      const { id, resolved } = req.body || {}; if (!id || typeof resolved !== 'boolean') return res.status(400).json({ error: 'Alerta e estado são obrigatórios.' });
      const { data, error } = await supabase.from('alerts').update({ resolved, resolved_at: resolved ? new Date().toISOString() : null, resolved_by: resolved ? principal.user.id : null }).eq('id', id).select('*').single(); if (error) throw error;
      await audit(supabase, principal, resolved ? 'ALERTA_RESOLVIDO' : 'ALERTA_REABERTO', 'alert', id, { title: data.title }); return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) { console.error('alerts API error:', err); res.status(500).json({ error: err.message || 'Erro interno.' }); }
}
