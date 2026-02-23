import react from "react";
import './Attendance.css';
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from 'react';
import api from "./api";
import kqlogo from "./kqlogo.png";
import dash from "./dashboard.png"
import contacts from "./contacts.png"
import calendar from "./calendar.png"
import requests from "./requests.png"
import att from "./person.png"
import logout from "./logout.png"
import students from "./students.png"
import enroll from "./enroll.png"


function getTodayYYYYMMDD() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function formatTime(timeStr) {
    // "03:30:00" -> "3:30 PM" (simple 12-hr formatting)
    const [hh, mm] = timeStr.split(":");
    const h = Number(hh);
    const hour12 = ((h + 11) % 12) + 1;
    const ampm = h >= 12 ? "PM" : "AM";
    return `${hour12}:${mm} ${ampm}`;
}

function normalizeStatus(s) {
    const v = (s ?? "").toString().trim().toLowerCase();
    if (!v) return "unmarked";
    if (v === "present") return "present";
    if (v === "absent") return "absent";
    if (v === "excused") return "excused";
    return "unmarked";
}

function Attendance() {
    const navigate = useNavigate();

    const [selectedDate, setSelectedDate] = useState(getTodayYYYYMMDD());
    const [user, setUser] = useState()
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [sideBar, setSideBar] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setMessage("");

                const res = await api.get("/attendance", {
                    params: { date: selectedDate }
                });

                const data = res.data;
                if (Array.isArray(data)) {
                    setSessions(data);
                    setMessage(data.length === 0 ? "No sessions scheduled for this date." : "");
                }
                else {
                    setSessions([]);
                    setMessage(data?.message || "No sessions scheduled for this date.");
                }


            } catch (e) {
                console.error("Attendance load error:", e.response?.status, e.response?.data || e);
                setSessions([]);
                setMessage("Failed to load attendance for this date.");
            } finally {
                setLoading(false);
            }

        };
        load();
    }, [selectedDate]);
    const summary = useMemo(() => {
        let total = 0;
        let unmarked = 0;
        let present = 0;
        let absent = 0;
        let excused = 0;

        for (const sess of sessions) {
            for (const st of sess.students || []) {
                total += 1;
                const status = normalizeStatus(st.attendance_status);
                if (status === "unmarked") unmarked += 1;
                if (status === "present") present += 1;
                if (status === "absent") absent += 1;
                if (status === "excused") excused += 1;
            }
        }

        return { total, unmarked, present, absent, excused };
    }, [sessions]);

    const go = (path) => navigate(path);

    const handleLogin = () => navigate("/loginPage");
    const handleDirectory = () => navigate("/directory");
    const handleDashboard = () => navigate("/dashboard");
    const handleSchedule = () => navigate("/schedule");
    const handleRequestsPages = () => navigate("/requests");
    const handleAttendancePage = () => navigate("/attendance");
    const handleStudentPage = () => navigate("/students");
    const handleEnrollment = () => navigate("/enrollment");


    return (
        <div className="attendance-page">
            {/* Header */}
            <nav className="header">
                <div className="header-left">
                    <img src={kqlogo} alt="Logo" className="logo" />
                    <h1>KnowledgeQuest</h1>
                </div>
                <div className="header-right">
                    <h3>{user?.first_name ? `${user.first_name} ${user.last_name}` : "Admin"}</h3>
                </div>
            </nav>

            {/* Sidebar + Main */}
            <div className="body">
                <aside className="sidebar">
                    <div className="profile">
                        <div className="avatar">
                            {user?.firstName?.[0] ?? "A"}
                            {user?.lastName?.[0] ?? "D"}
                        </div>
                        <p className="name">{user ? `${user.first_name}` : "Admin"}</p>
                        <p className="courses">Admin Dashboard</p>
                    </div>

                    <button className="nav-link" onClick={handleDashboard}>
                        <img src={dash} className="logo-1" alt="" />
                        <span className="nav-text">Dashboard</span>
                    </button>
                    <button className="nav-link" onClick={handleDirectory}>
                        <img src={contacts} className="logo-1" alt="" />
                        <span className="nav-text">Tutor Directory</span>
                    </button>
                    <button className="nav-link" onClick={handleRequestsPages}>
                        <img src={requests} className="logo-1" alt="" />
                        <span className="nav-text">Requests</span>
                    </button>
                    <button className="nav-link" onClick={handleSchedule}>
                        <img src={calendar} className="logo-1" alt="" />
                        <span className="nav-text">Schedule</span>
                    </button>
                    <button className="nav-link" onClick={handleAttendancePage}>
                        <img src={att} className="logo-1" alt="" />
                        <span className="nav-text">Attendance</span>
                    </button>
                    <button className="nav-link" onClick={handleStudentPage}>
                        <img src={students} className="logo-1" alt="" />
                        <span className="nav-text">Students</span>
                    </button>
                    <button className="nav-link" onClick={handleEnrollment}>
                        <img src={enroll} className="logo-1" alt="" />
                        <span className="nav-text">Enrollment</span>
                    </button>

                    <button className="nav-link" onClick={handleLogin}>
                        <img src={logout} className="logo-1" alt="" />
                        <span className="nav-text">Logout</span>
                    </button>

                </aside>
                <main className="main">
                    {/* Top controls */}
                    <div className="top-row">
                        <div>
                            <h2>Attendance</h2>
                            <p className="muted">View attendance status for a specific day.</p>
                        </div>

                        <div className="date-controls">
                            <button
                                className="small-btn"
                                onClick={() => {
                                    const d = new Date(selectedDate);
                                    d.setDate(d.getDate() - 1);
                                    setSelectedDate(d.toISOString().slice(0, 10));
                                }}
                            >
                                ◀
                            </button>

                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />

                            <button
                                className="small-btn"
                                onClick={() => {
                                    const d = new Date(selectedDate);
                                    d.setDate(d.getDate() + 1);
                                    setSelectedDate(d.toISOString().slice(0, 10));
                                }}
                            >
                                ▶
                            </button>

                            <button className="small-btn" onClick={() => setSelectedDate(getTodayYYYYMMDD())}>
                                Today
                            </button>
                        </div>
                    </div>

                    {/* Summary cards */}
                    <div className="summary">
                        <div className="summary-card">
                            <div className="summary-num">{summary.total}</div>
                            <div className="summary-label">Students listed</div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-num">{summary.unmarked}</div>
                            <div className="summary-label">Unmarked</div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-num">{summary.present}</div>
                            <div className="summary-label">Present</div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-num">{summary.absent}</div>
                            <div className="summary-label">Absent</div>
                        </div>
                    </div>

                    {/* Session list */}
                    <div className="content-card">
                        {loading ? (
                            <p className="muted">Loading attendance…</p>
                        ) : message ? (
                            <p className="muted">{message}</p>
                        ) : (
                            <div className="sessions">
                                {sessions.map((sess) => (
                                    <div className="session-card" key={sess.session_instance_id}>
                                        <div className="session-head">
                                            <div>
                                                <div className="session-title">
                                                    {sess.tutor_first_name} {sess.tutor_last_name}
                                                </div>
                                                <div className="session-sub">
                                                    {sess.day} • {formatTime(sess.start_time)}–{formatTime(sess.end_time)}
                                                </div>
                                            </div>

                                            {/* Later: add "Mark attendance" button */}
                                            <button className="ghost-btn" disabled>
                                                Edit (later)
                                            </button>
                                        </div>

                                        <div className="student-list">
                                            {(sess.students || []).map((st) => {
                                                const status = normalizeStatus(st.attendance_status);
                                                return (
                                                    <div className="student-row" key={st.student_id}>
                                                        <div className="student-name">
                                                            {st.first_name} {st.last_name}
                                                        </div>
                                                        <span className={`status ${status}`}>
                                                            {status === "unmarked" ? "Unmarked" : status}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Attendance;