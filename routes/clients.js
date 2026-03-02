const { Router } = require('express');
const { createClient, listClients, renameClient, deleteClient } = require('../database/clients');
const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const clients = await listClients();
    res.json(clients);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const client = await createClient(name);
    res.cookie('active_client_id', client.id, { httpOnly: false, path: '/' });
    res.status(201).json(client);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { name } = req.body;
    const client = await renameClient(parseInt(req.params.id, 10), name);
    if (!client) return res.status(404).json({ error: 'Not found' });
    res.json(client);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteClient(parseInt(req.params.id, 10));
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
