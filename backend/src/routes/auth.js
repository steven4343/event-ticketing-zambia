const { Router } = require('express');
const { register, login, refresh, logout, getMe, changePassword, googleAuth } = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { registerValidation, loginValidation } = require('../middlewares/validate');
const { checkLockout } = require('../middlewares/accountLockout');

const router = Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, checkLockout, login);
router.post('/google', googleAuth);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/password', authenticate, changePassword);

module.exports = router;
