const express = require('express');
const router = express.Router();
const BattleController = require('../controllers/BattleController');
const auth = require('../middleware/auth');

router.get('/leaderboard', auth, BattleController.getLeaderboard);
router.get('/', auth, BattleController.getMyBattles);
router.get('/:id', auth, BattleController.getById);
router.post('/', auth, BattleController.create);
router.put('/:id/accept', auth, BattleController.accept);
router.put('/:id/reject', auth, BattleController.reject);
router.post('/:id/checkin', auth, BattleController.checkin);

module.exports = router;
