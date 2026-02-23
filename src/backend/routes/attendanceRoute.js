import express from 'express'
import authToken from '../middleware/jwtAuth.js'
import requireAdmin from '../middleware/requireAdmin.js';
import attendance from '../controllers/attendanceController.js'

const route = express.Router();

route.post("/markAttendance", authToken, requireAdmin, attendance.markAttendance);
route.get("/viewAttendance", authToken, requireAdmin, attendance.viewAttendanceBySessionInstance);
route.get("/attendance", authToken, requireAdmin, attendance.viewAttendanceByDate);
route.get("/viewStudentAttendance", authToken, requireAdmin, attendance.viewStudentAttendanceRecord);
route.get("/byDate", authToken, requireAdmin, attendance.getStudentAttendanceByDate);
route.delete("/entry", authToken, requireAdmin, attendance.deleteAttendanceRecord);
route.get("/byMonth/:student_id", authToken, requireAdmin, attendance.getStudentMonthCalendar);
route.get("/studentHours/:student_id", authToken, requireAdmin, attendance.getStudentHoursSummary);




export default route;