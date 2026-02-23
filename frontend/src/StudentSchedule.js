import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "./api";
import "./StudentSchedule.css";

import kqlogo from "./kqlogo.png";
import dash from "./dashboard.png"
import contacts from "./contacts.png"
import calendar from "./calendar.png"
import requests from "./requests.png"
import att from "./person.png"
import logout from "./logout.png"
import student from "./students.png"
import enroll from "./enroll.png"
const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];


function formatTime(timeStr) {
    if (!timeStr) return "";

    const [hh, mm] = timeStr.split(":");
    const h = Number(hh);

    const hour12 = ((h + 11) % 12) + 1;
    const ampm = h >= 12 ? "PM" : "AM";

    return `${hour12}:${mm.padStart(2, "0")} ${ampm}`;
}

export default function StudentSchedule() {
    const navigate = useNavigate();

    const [sideBarOpen, setSideBarOpen] = useState(true);
    const [user, setUser] = useState(null);

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [sessions, setSessions] = useState([]);
    const [q, setQ] = useState("");

    const { student_id } = useParams(); // student_id
    const location = useLocation();
    const studentFromState = location.state?.student;

    // Load admin/user name (same as your Dashboard pattern)
    useEffect(() => {
        const userId = localStorage.getItem("userID");
        if (!userId) return;

        fetch(`http://localhost:5001/user/${encodeURIComponent(userId)}`)
            .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
            .then((data) => {
                const first = data.first_name ?? data.firstName ?? "";
                const last = data.last_name ?? data.lastName ?? "";
                if (first || last) setUser({ firstName: first, lastName: last, ...data });
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (!student_id) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setMsg("");

            try {

                // ✅ adjust if your route is different
                const res = await api.get(`/viewStudentSchedule/schedule/${student_id}`);
                if (cancelled) return;

                const data = Array.isArray(res.data) ? res.data : [];
                setSessions(data);
                if (data.length === 0) setMsg("No sessions scheduled for this student.");
            } catch (e) {
                if (!cancelled) setMsg("Failed to load student schedule.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [student_id]);

    const grouped = useMemo(() => {
        const map = new Map();
        for (const day of DAY_ORDER) map.set(day, []);
        for (const s of sessions) {
            const day = s.day;
            if (!map.has(day)) map.set(day, []);
            map.get(day).push(s);
        }
        return map;
    }, [sessions]);

    // nav handlers
    const handleLogin = () => navigate("/loginPage");
    const handleDirectory = () => navigate("/directory");
    const handleDashboard = () => navigate("/dashboard");
    const handleSchedule = () => navigate("/schedule");
    const handleRequestsPages = () => navigate("/requests");
    const handleAttendancePage = () => navigate("/attendance");
    const handleStudentsPage = () => navigate("/students");
    const handleEnrollment = () => navigate("/enrollment");

    return (
        <div className="student-schedule-page">
            <div className={`app-shell ${sideBarOpen ? "sidebar-open" : "sidebar-closed"}`}>
                <nav className="header">
                    <button className="sidebar-toggle" onClick={() => setSideBarOpen((v) => !v)}>
                        ☰
                    </button>

                    <div className="header-left">
                        <img src={kqlogo} alt="Logo" className="logo" />
                        <h1>KnowledgeQuest</h1>
                    </div>

                    <div className="header-right">
                        <h3>{user ? `${user.firstName} ${user.lastName}` : "Admin"}</h3>
                    </div>
                </nav>

                <div className="app-body">
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
                        <button className="nav-link" onClick={handleStudentsPage}>
                            <img src={student} className="logo-1" alt="" />
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
                    <main className="main-content">
                        <div className="card">
                            <div className="topbar">
                                <button className="btn" onClick={() => navigate(-1)}>← Back</button>

                                <div className="title">
                                    <h2>
                                        {studentFromState
                                            ? `${studentFromState.first_name ?? studentFromState.firstName ?? ""} ${studentFromState.last_name ?? studentFromState.lastName ?? ""}`.trim()
                                            : `Student #${student_id}`}
                                    </h2>
                                    <p className="muted">Weekly schedule</p>
                                </div>
                            </div>

                            {loading ? (
                                <div className="muted">Loading schedule…</div>
                            ) : msg ? (
                                <div className="muted">{msg}</div>
                            ) : (
                                <div className="week-grid">
                                    {DAY_ORDER.map((day) => (
                                        <div key={day} className="day-col">
                                            <div className="day-header">{day}</div>

                                            <div className="day-body">
                                                {grouped.get(day)?.length ? (
                                                    grouped.get(day).map((s) => (
                                                        <div key={s.session_id} className="session">
                                                            <div className="session-time">
                                                                {formatTime(s.start_time)} – {formatTime(s.end_time)}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="empty">—</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </main>

                </div>
            </div>
        </div>
    );
}
