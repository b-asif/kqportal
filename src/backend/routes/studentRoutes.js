import express from 'express'
import students from '../controllers/studentController.js';
import authToken from '../middleware/jwtAuth.js'
import requireAdmin from '../middleware/requireAdmin.js';

const route = express.Router();

route.post('/', authToken, requireAdmin, students.newStudent);
route.get('/', authToken, requireAdmin, students.getStudents);
route.get('/:id', authToken, requireAdmin, students.getStudentByID);
route.patch('/:id', authToken, requireAdmin, students.updateInfo);
route.delete('/:id', authToken, requireAdmin, students.deleteStudentInfo);
route.post('/:student_id', authToken, requireAdmin, students.assignGuardian);
route.get('/parentOfStudent/:student_id', authToken, requireAdmin, students.getParentInfo);
route.get('/:parent_id', authToken, requireAdmin, students.getStudentOfParent); // come back to the printing

export default route;