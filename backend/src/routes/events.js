const { Router } = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const { createEventValidation } = require('../middlewares/validate');
const {
  browseEvents, getEvent, createEvent, updateEvent,
  cancelEvent, approveEvent, getOrganizerEvents, getEventStats, getCategories,
  cloneEvent, publishEvent
} = require('../controllers/eventController');

const router = Router();

router.get('/categories', getCategories);
router.get('/', browseEvents);
router.get('/my-events', authenticate, authorize('organizer'), getOrganizerEvents);
router.get('/:id', getEvent);
router.post('/', authenticate, authorize('organizer'), createEventValidation, createEvent);
router.put('/:id', authenticate, authorize('organizer'), updateEvent);
router.delete('/:id', authenticate, authorize('organizer'), cancelEvent);
router.patch('/:id/approve', authenticate, authorize('super_admin'), approveEvent);
router.get('/:id/stats', authenticate, authorize('organizer', 'super_admin'), getEventStats);
router.post('/:id/clone', authenticate, authorize('organizer'), cloneEvent);
router.patch('/:id/publish', authenticate, authorize('organizer'), publishEvent);

module.exports = router;
