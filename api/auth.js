import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { query } from './db-client.js';
import { cors, isOptions } from './guard.js';

const secret = () => process.env.JWT_SECRET || 'change-this-secret';
const issue = (user) => jwt.sign({ id: user.user_id, email: user.email, user_metadata: { full_name: user.full_name } }, secret(), { expiresIn: '7d' });

export default async function handler(req, res) {
  cors(res); if (isOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const { email, password, signUp } = req.body || {};
    if (!email || !password || password.length < 6) return res.status(400).json({ error: 'E-mail e senha com no mínimo 6 caracteres são obrigatórios.' });
    const normalizedEmail = String(email).trim().toLowerCase();
    const users = await query('SELECT * FROM user_profiles WHERE email = ? LIMIT 1', [normalizedEmail]);
    if (signUp) {
      if (users.length) return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
      const user = { user_id: randomUUID(), email: normalizedEmail, full_name: '', role: 'Consulta' };
      const passwordHash = await bcrypt.hash(password, 12);
      await query('INSERT INTO user_profiles (user_id, email, full_name, role, password_hash) VALUES (?, ?, ?, ?, ?)', [user.user_id, user.email, user.full_name, user.role, passwordHash]);
      return res.status(201).json({ session: { access_token: issue(user), user: { id: user.user_id, email: user.email } }, profile: user });
    }
    if (!users.length || !(await bcrypt.compare(password, users[0].password_hash))) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    const user = users[0];
    return res.status(200).json({ session: { access_token: issue(user), user: { id: user.user_id, email: user.email } }, profile: user });
  } catch (error) { console.error('auth API error:', error); return res.status(500).json({ error: error.message || 'Erro interno.' }); }
}
