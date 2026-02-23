import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from "./LoginPage";
import Register from "./Register";
import Dashboard from "./Dashboard";
import Directory from './Directory';
import Attendance from './Attendance';
import Schedule from './Schedule';
import Students from './Students';
import StudentSchedule from "./StudentSchedule";
import Enrollment from "./Enrollment";
import StudentAttendance from "./StudentAttendance"
import StudentProfile from "./StudentProfile"


function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/loginPage" />} />
      <Route path="/loginPage" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/register" element={<Register />} />
      <Route path="/directory" element={<Directory />} />
      <Route path="/attendance" element={<Attendance />} />
      <Route path="/schedule" element={<Schedule />} />
      <Route path="/students" element={<Students />} />
      <Route path="/students/:student_id/schedule" element={<StudentSchedule />} />
      <Route path="/enrollment" element={<Enrollment />} />
      <Route path="/viewMonthly/byMonth/:student_id" element={<StudentAttendance />} />
      <Route path="/students/:id" element={<StudentProfile />} />
      

    </Routes>
  );
}

export default App;
