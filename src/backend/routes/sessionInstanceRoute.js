import express from 'express'
import authToken from '../middleware/jwtAuth.js'
import requireAdmin from '../middleware/requireAdmin.js';
import sessInstances from '../controllers/sessionInstanceController.js'

const route = express.Router();

route.post("/generateInstance", authToken, requireAdmin, sessInstances.generateInstance);
route.get("/date", authToken, requireAdmin, sessInstances.retrieveScheduleForDate);

export default route;