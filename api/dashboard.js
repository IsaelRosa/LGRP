import supabase from './db-client.js';
import { cors, isOptions, requireUser } from './guard.js';
export default async function handler(req, res) {
  cors(res); if (isOptions(req, res)) return;
  try {
    const principal = await requireUser(req, res); if (!principal) return;
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
    const [w, r, o, a] = await Promise.all([
      supabase.from('wastes').select('id,quantity,status,generated_at'),
      supabase.from('waste_requests').select('id,status'),
      supabase.from('operations').select('id,action,net_weight,occurred_at'),
      supabase.from('alerts').select('id,resolved')
    ]);
    for (const result of [w, r, o, a]) if (result.error) throw result.error;
    const wastes = w.data || [], requests = r.data || [], operations = o.data || [], alerts = a.data || [];
    const stagesMap = new Map(); wastes.forEach(x => stagesMap.set(x.status || 'Não classificado', (stagesMap.get(x.status || 'Não classificado') || 0) + 1));
    const stages = [...stagesMap.entries()].map(([status, count]) => ({ status, count }));
    const months = [];
    for (let back = 5; back >= 0; back--) { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - back); const label = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''); const total = operations.filter(x => { if (!x.occurred_at) return false; const d = new Date(x.occurred_at); return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear(); }).reduce((sum, x) => sum + Number(x.net_weight || 0), 0); months.push({ label: label.charAt(0).toUpperCase() + label.slice(1), total }); }
    const start = new Date(); start.setDate(start.getDate() - 90);
    const periodWeight = operations.filter(x => x.occurred_at && new Date(x.occurred_at) >= start).reduce((sum, x) => sum + Number(x.net_weight || 0), 0);
    return res.status(200).json({ active_wastes: wastes.filter(x => !['Destinado', 'Encerrado'].includes(x.status)).length, stored_weight: wastes.filter(x => ['Em armazenamento', 'Aguardando coleta'].includes(x.status)).reduce((sum, x) => sum + Number(x.quantity || 0), 0), pending_requests: requests.filter(x => ['Recebida', 'Em análise', 'Aprovada'].includes(x.status)).length, active_alerts: alerts.filter(x => !x.resolved).length, stages, monthly: months, period_weight: periodWeight });
  } catch (err) { console.error('dashboard API error:', err); res.status(500).json({ error: err.message || 'Erro interno.' }); }
}
