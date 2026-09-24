import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import auth from './api/auth.js';
import authProfile from './api/auth-profile.js';
import alerts from './api/alerts.js';
import assets from './api/assets.js';
import audit from './api/audit.js';
import dashboard from './api/dashboard.js';
import operations from './api/operations.js';
import requests from './api/requests.js';
import waste from './api/waste.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const root = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', auth);
app.use('/api/auth-profile', authProfile);
app.use('/api/alerts', alerts);
app.use('/api/assets', assets);
app.use('/api/audit', audit);
app.use('/api/dashboard', dashboard);
app.use('/api/operations', operations);
app.use('/api/requests', requests);
app.use('/api/waste', waste);

app.use(express.static(path.join(root, 'dist')));
app.use((req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));

app.listen(port, () => console.log(`LGRP server listening on port ${port}`));
