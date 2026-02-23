import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Students.css";
import api from "./api";

import kqlogo from "./kqlogo.png";
import dash from "./dashboard.png"
import contacts from "./contacts.png"
import calendar from "./calendar.png"
import requests from "./requests.png"
import att from "./person.png"
import logout from "./logout.png"
import student from "./students.png"
import enroll from "./enroll.png"

export default function Students() {
    const navigate = useNavigate();

    const [sideBarOpen, setSideBarOpen] = useState(true);
    const [user, setUser] = useState(null);

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [q, setQ] = useState("");

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

    // Fetch students
    useEffect(() => {
        let cancelled = false;

        async function loadStudents() {
            setLoading(true);
            setMsg("");

            try {
                // ✅ Change this to whatever route you exposed in Express, e.g. "/students"
                const res = await api.get("/getStudents");
                if (cancelled) return;
                const data = Array.isArray(res.data) ? res.data : [];
                setStudents(data);
                if (data.length === 0) setMsg("No students found.");
            } catch (err) {
                if (!cancelled) setMsg("Failed to load students.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadStudents();
        return () => {
            cancelled = true;
        };
    }, []);

    // Search filter (name/email/grade/etc.)
    const filtered = useMemo(() => {
        const query = q.trim().toLowerCase();
        if (!query) return students;

        return students.filter((s) => {
            // Adjust these keys to match your DB fields
            const first = (s.first_name ?? s.firstName ?? "").toLowerCase();
            const last = (s.last_name ?? s.lastName ?? "").toLowerCase();
            const grade = String(s.grade ?? s.grade_level ?? "").toLowerCase();

            const haystack = `${first} ${last} ${grade}`;
            return haystack.includes(query);
        });
    }, [students, q]);

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
        <div className="students-page">
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
                            <div className="students-top">
                                <div className="students-title">
                                    <h2>Students</h2>
                                    <p className="muted">{filtered.length} shown</p>
                                </div>

                                <div className="students-search">
                                    <input
                                        type="text"
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        placeholder="Search by name, grade,…"
                                        aria-label="Search students"
                                    />
                                </div>
                            </div>

                            {loading ? (
                                <div className="muted">Loading students…</div>
                            ) : msg ? (
                                <div className="muted">{msg}</div>
                            ) : (
                                <div className="table-wrap">
                                    <table className="students-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Grade</th>
                                                <th>Parent Contact</th>
                                                <th>Attendance</th>
                                                <th>Weekly Schedule</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.map((s) => {
                                                const first = s.first_name ?? s.firstName ?? "";
                                                const last = s.last_name ?? s.lastName ?? "";
                                                return (
                                                    <tr key={s.student_id ?? s.id ?? `${first}-${last}`}
                                                        className="clickable-row"
                                                        onClick={() => {
                                                            const sid = s.student_id ?? s.id ?? s.studentId;
                                                            if (!sid) {
                                                                console.log("Student row missing id:", s);
                                                                return;
                                                            }
                                                            //change to profile.
                                                            navigate(`/students/${sid}`, { state: { student: s } });
                                                        }}

                                                    >
                                                        <td className="name-cell">{first} {last}</td>
                                                        <td>{s.grade ?? s.grade_level ?? "—"}</td>
                                                        <td onClick={(e) => e.stopPropagation()}>
                                                            {Array.isArray(s.parents) && s.parents.length > 0 ? (
                                                                <div className="parent-cell">
                                                                    {s.parents.map((p) => (
                                                                        <div key={p.parent_id} className="parent-entry">
                                                                            <div className="parent-name">
                                                                                {p.first_name} {p.last_name}
                                                                            </div>
                                                                            <div className="parent-sub">
                                                                                {p.email ?? "—"}
                                                                                {p.phone ? ` • ${p.phone}` : ""}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="muted">Not linked</span>
                                                            )}
                                                        </td>
                                                        <td onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                className="btn"
                                                                onClick={() => {
                                                                    const sid = s.student_id ?? s.id ?? s.studentId;
                                                                    if (!sid) return;
                                                                    navigate(`/viewMonthly/byMonth/${sid}`, { state: { student: s } });
                                                                }}
                                                                type="button"
                                                            >
                                                                View
                                                            </button>
                                                        </td>
                                                        <td onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                className="btn"
                                                                onClick={() => {
                                                                    const sid = s.student_id ?? s.id ?? s.studentId;
                                                                    if (!sid) return;
                                                                    navigate(`/students/${sid}/schedule`, { state: { student: s } });
                                                                }}
                                                                type="button"
                                                            >
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
