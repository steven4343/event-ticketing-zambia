const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const { validateTicket, checkIn } = require('../controllers/scannerController');

const router = Router();

router.post('/validate', authenticate, validateTicket);
router.post('/check-in', authenticate, checkIn);

module.exports = router;
