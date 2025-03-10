const { Router } = require('express');
const { getUsuarios } = require('../controllers/usuarios');

const router = Router();

router.get('/', getUsuarios);

module.exports = router;