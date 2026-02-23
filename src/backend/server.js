import express from 'express'
import dotenv from 'dotenv'
import pool from './db/db.js';
import generateToken from './utilities/jwt.js'
import hashing from './utilities/hashing.js'
import users from './models/userModels.js'
import auth from './routes/authRoute.js'
import verifyToken from './middleware/jwtAuth.js';
import requireAdmin from './middleware/requireAdmin.js';
import newUser from './routes/userRoutes.js';
import student from './routes/studentRoutes.js';
import session from './routes/sessionRoute.js';
import enroll from './routes/enrollmentRoute.js';
import sessionInstance from './routes/sessionInstanceRoute.js'
import attendanceTracking from './routes/attendanceRoute.js'

dotenv.config({ quiet: true })
const app = express();
app.use(express.json())
const PORT = 8000;

app.listen(PORT, () => {
    console.log(`Port listening on port ${PORT}`)
});

app.get('/main', (req, res) => {
    res.send("hello");
})

app.get('/health', (req, res) => {
    res.sendStatus(200).send("OK!");
    pool.query("SElECT NOW()", (err, result) => {
        if (err) {
            console.log("Database failed to connect");
            res.sendStatus(500).send("internal error");
        }
        else {
            console.log("database connected!");
        }
    })

})
app.use((req, res, next) => {
    console.log('➡️  Incoming request:', req.method, req.url);
    next();
});
app.use('/api/auth', auth);
app.use('/api/newUser', newUser);
app.use('/api/viewAllUsers', newUser)
app.use('/api/viewUser', newUser) // getting user by id 
app.use('/api/update', newUser);
app.use('/api/delete', newUser);
app.use('/api/addStudent', student);
app.use('/api/getStudent', student);
app.use('/api/getStudents', student);
app.use('/api/updateStudentInfo', student);
app.use('/api/deleteStudent', student);
app.use('/api/assign-guardian', student);
app.use('/api/parent', student)
app.use('/api/studentOfParent', student);
app.use('/api/createSession', session);
app.use('/api/getSessions', session);
app.use('/api/session', session);
app.use('/api/viewAllWeek', session);
app.use('/api/viewTutorSessions', session);
app.use('/api/session-info', session);
app.use('/api/session-instance', session);
app.use('/api/session-enrollment', enroll);
app.use('/api/viewStudentSchedule', enroll);
app.use('/api/removeStudentSession', enroll);
app.use('/api/view', enroll);
app.use('/api/sessionInstance', sessionInstance);
app.use('/api/track', attendanceTracking);
app.use('/api/attendance/bySessionInstance', attendanceTracking);
app.use('/api', attendanceTracking);
app.use('/api/studentAttendance', attendanceTracking);
app.use('/api/stuAtt', attendanceTracking);
app.use('/api/deleteRecord', attendanceTracking);
app.use('/api/viewScheduleFor', sessionInstance);
app.use('/api/viewMonthly', attendanceTracking);
app.use('/api/viewPayment', attendanceTracking);
app.use('/api/payment', enroll)



app.get('/api/protected', verifyToken, (req, res) => {
    res.json({ message: "protected route accesed", user: req.user })
})
app.get('/api/admin', verifyToken, requireAdmin, (req, res) => {
    res.json({ message: "this is only accessible by admin", user: req.user })
})
// TESTING 
// hashing password 
app.post('/signup', async (req, res) => {
    try {
        const { first_name, last_name, email, password, phone_num, role } = req.body;
        const hash = await hashing.hashPassword(password);
        const newUser = await users.addUser(first_name, last_name, email, hash, phone_num, role);

        res.status(201).json({ message: "User created", user: newUser });
    } catch (error) {
        console.log("Server issue", error)
        res.status(500).json({ message: "error adding user to the database" })
    }
})

//generating JWT
app.post('/login', (req, res) => {
    const { email } = req.body;
    const payload = {
        email,
        role: 'parent'
    }
    const token = generateToken(payload)
    res.json({ token })
})




