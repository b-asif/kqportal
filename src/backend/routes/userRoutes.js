import express from 'express';
import users from '../controllers/userController.js';
//authenticate who is creating the user 
import authToken from '../middleware/jwtAuth.js'
import requireAdmin from '../middleware/requireAdmin.js';

const route = express.Router();

route.post('/', users.newUser);
route.get('/', authToken, requireAdmin, users.getUsers);
route.get('/:id', authToken, requireAdmin, users.getUserByID);
route.patch('/:id', authToken, requireAdmin, users.updateData);
route.delete('/:id', authToken, requireAdmin, users.deleteUser);

export default route;