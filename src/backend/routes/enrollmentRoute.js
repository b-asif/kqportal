import express from 'express'
import authToken from '../middleware/jwtAuth.js'
import requireAdmin from '../middleware/requireAdmin.js';
import enrollmentController from '../controllers/enrollmentController.js';

const route = express.Router();

route.post("/enroll/:session_id", authToken, requireAdmin, enrollmentController.enrollStudent);
route.get("/schedule/:student_id", authToken, requireAdmin, enrollmentController.viewSchedule);
route.delete("/:student_id/:session_id", authToken, requireAdmin, enrollmentController.deleteSession)
route.get("/students-session/:session_id", authToken, requireAdmin, enrollmentController.viewAllStudentsInSession)
route.post("/enrollmentPlan/:student_id", authToken, requireAdmin, enrollmentController.createEnrollmentPlan);


export default route;