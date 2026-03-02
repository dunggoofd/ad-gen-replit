const { getClientById, getDefaultClient } = require('../database/clients');

async function clientScope(req, res, next) {
  try {
    let client = null;

    if (req.headers['x-client-id']) {
      client = await getClientById(parseInt(req.headers['x-client-id'], 10));
    }

    if (!client && req.cookies.active_client_id) {
      client = await getClientById(parseInt(req.cookies.active_client_id, 10));
    }

    if (!client) {
      client = await getDefaultClient();
    }

    if (!client) {
      return res.status(503).json({ error: 'No client workspace available. Create a client first.' });
    }

    req.clientId = client.id;
    req.client = client;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { clientScope };
