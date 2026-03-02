const { Router } = require('express');
const fs = require('fs');
const { getBrandKit, upsertBrandKit, updateLogoFields, clearLogoField } = require('../database/brandKits');
const { logoUpload } = require('../middleware/upload');
const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const kit = await getBrandKit(req.clientId);
    res.json(kit || {});
  } catch (err) { next(err); }
});

router.put('/', async (req, res, next) => {
  try {
    const { primaryColor, secondaryColor, accentColor, fonts, toneOfVoice, tagline } = req.body;
    const kit = await upsertBrandKit(req.clientId, {
      primaryColor, secondaryColor, accentColor, fonts, toneOfVoice, tagline,
    });
    res.json(kit);
  } catch (err) { next(err); }
});

router.post('/logo', logoUpload.fields([
  { name: 'logo_light', maxCount: 1 },
  { name: 'logo_dark',  maxCount: 1 },
  { name: 'logo_icon',  maxCount: 1 },
]), async (req, res, next) => {
  try {
    const updates = {};
    for (const field of ['logo_light', 'logo_dark', 'logo_icon']) {
      if (req.files && req.files[field]) {
        updates[field] = `/uploads/logos/${req.files[field][0].filename}`;
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid logo file uploaded' });
    }
    const kit = await updateLogoFields(req.clientId, updates);
    res.json(kit);
  } catch (err) { next(err); }
});

router.delete('/logo/:field', async (req, res, next) => {
  try {
    const { field } = req.params;
    const allowed = ['logo_light', 'logo_dark', 'logo_icon'];
    if (!allowed.includes(field)) return res.status(400).json({ error: 'Invalid field' });
    const kit = await getBrandKit(req.clientId);
    const filepath = kit && kit[field];
    await clearLogoField(req.clientId, field);
    if (filepath) {
      fs.unlink(`public${filepath}`, () => {});
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
