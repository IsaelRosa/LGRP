import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || process.env.DB_HOST,
  port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
  user: process.env.MYSQL_USER || process.env.DB_USER,
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  timezone: 'Z',
});

export async function query(sql, values = []) {
  const [rows] = await pool.execute(sql, values);
  return rows;
}

const identifier = (value) => `\`${String(value).replace(/[^a-zA-Z0-9_]/g, '')}\``;
const parseColumns = (columns) => columns === '*' ? '*' : columns.split(',').map((column) => identifier(column.trim())).join(', ');

class QueryBuilder {
  constructor(table) { this.table = table; this.mode = 'select'; this.filters = []; this.values = []; }
  select(columns = '*') { this.columns = columns; return this; }
  insert(data) { this.mode = 'insert'; this.data = data; return this; }
  update(data) { this.mode = 'update'; this.data = data; return this; }
  eq(column, value) { this.filters.push(`${identifier(column)} = ?`); this.values.push(value); return this; }
  order(column, options = {}) { this.orderBy = `${identifier(column)} ${options.ascending === false ? 'DESC' : 'ASC'}`; return this; }
  limit(value) { this.max = Number(value); return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; this.maybe = true; return this; }
  async execute() {
    try {
      let rows;
          if (this.mode === 'insert') {
            const keys = Object.keys(this.data);
            const values = keys.map((key) => this.data[key] === undefined ? null : (typeof this.data[key] === 'object' && this.data[key] !== null ? JSON.stringify(this.data[key]) : this.data[key]));
            const [result] = await pool.execute(`INSERT INTO ${identifier(this.table)} (${keys.map(identifier).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, values);
        rows = await query(`SELECT * FROM ${identifier(this.table)} WHERE id = ?`, [result.insertId]);
      } else if (this.mode === 'update') {
        const keys = Object.keys(this.data);
        await pool.execute(`UPDATE ${identifier(this.table)} SET ${keys.map((key) => `${identifier(key)} = ?`).join(', ')}${this.filters.length ? ` WHERE ${this.filters.join(' AND ')}` : ''}`, [...keys.map((key) => this.data[key]), ...this.values]);
        rows = await query(`SELECT * FROM ${identifier(this.table)}${this.filters.length ? ` WHERE ${this.filters.join(' AND ')}` : ''}${this.max ? ` LIMIT ${this.max}` : ''}`, this.values);
      } else {
        const nestedWastes = this.table === 'operations' && String(this.columns).includes('wastes(');
        const columns = nestedWastes ? '*' : parseColumns(this.columns || '*');
        rows = await query(`SELECT ${columns} FROM ${identifier(this.table)}${this.filters.length ? ` WHERE ${this.filters.join(' AND ')}` : ''}${this.orderBy ? ` ORDER BY ${this.orderBy}` : ''}${this.max ? ` LIMIT ${this.max}` : ''}`, this.values);
        if (nestedWastes) {
          for (const row of rows) {
            const nested = await query('SELECT code, name, lab_name FROM wastes WHERE id = ?', [row.waste_id]);
            row.wastes = nested[0] || null;
          }
        }
      }
      if (this.one) {
        if (!rows.length && !this.maybe) throw new Error(`Registro não encontrado em ${this.table}.`);
        return { data: rows[0] || null, error: null };
      }
      return { data: rows, error: null };
    } catch (error) { return { data: null, error }; }
  }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
}

const supabase = {
  from: (table) => new QueryBuilder(table),
  auth: {
    async getUser(token) {
      try { return { data: { user: jwt.verify(token, process.env.JWT_SECRET || 'change-this-secret') }, error: null }; }
      catch (error) { return { data: { user: null }, error }; }
    },
  },
};

export default supabase;
