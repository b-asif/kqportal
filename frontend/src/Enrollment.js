import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Enrollment.css";
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

function formatTime(timeStr) {
    if (!timeStr) return "";

    const [hh, mm] = timeStr.split(":");
    const h = Number(hh);

    const hour12 = ((h + 11) % 12) + 1;
    const ampm = h >= 12 ? "PM" : "AM";

    return `${hour12}:${mm.padStart(2, "0")} ${ampm}`;
}

export default function Enrollment() {
    const navigate = useNavigate();

    const [sideBarOpen, setSideBarOpen] = useState(true);
    const [user, setUser] = useState(null);

    // form state
    const [student, setStudent] = useState({
        first_name: "",
        last_name: "",
        grade: "",
    });

    const [parent, setParent] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone_num: "",
        password: "",
    });

    // sessions
    const [sessions, setSessions] = useState([]);
    const [selectedSessions, setSelectedSessions] = useState([]);

    // UI state
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(""); // general message
    const [msgType, setMsgType] = useState("info"); // "info" | "success" | "error"
    const [q, setQ] = useState(""); // session search

    // Load admin/user name (same pattern as your Students page)
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

    // Fetch sessions for day/time picker
    useEffect(() => {
        let cancelled = false;

        async function loadSessions() {
            try {
                setMsg("");
                // ✅ adjust route to yours; you need some GET sessions endpoint
                const res = await api.get("/getSessions");
                if (cancelled) return;

                // expecting either array or {sessions: []}
                const data = Array.isArray(res.data) ? res.data : (res.data.sessions || []);
                setSessions(data);
                if (data.length === 0) {
                    setMsgType("info");
                    setMsg("No sessions found.");
                }
            } catch (err) {
                if (!cancelled) {
                    setMsgType("error");
                    setMsg("Failed to load sessions. Make sure GET /sessions exists.");
                }
            }
        }

        loadSessions();
        return () => {
            cancelled = true;
        };
    }, []);

    // session search/filter
    const filteredSessions = useMemo(() => {
        const query = q.trim().toLowerCase();
        if (!query) return sessions;

        return sessions.filter((s) => {
            const day = String(s.day ?? s.weekday ?? "").toLowerCase();
            const start = String(s.start_time ?? s.start ?? "").toLowerCase();
            const end = String(s.end_time ?? s.end ?? "").toLowerCase();
            const tutor = String(s.tutor_name ?? s.tutor ?? "").toLowerCase();
            const label = `${day} ${start} ${end} ${tutor}`;
            return label.includes(query);
        });
    }, [sessions, q]);

    function toggleSession(session_id) {
        setSelectedSessions((prev) =>
            prev.includes(session_id)
                ? prev.filter((id) => id !== session_id)
                : [...prev, session_id]
        );
    }

    function resetForm() {
        setStudent({ first_name: "", last_name: "", grade: "" });
        setParent({ first_name: "", last_name: "", email: "", phone_num: "", password: "" });
        setSelectedSessions([]);
    }

    function validate() {
        if (!student.first_name || !student.last_name || !student.grade) {
            return "Student fields are missing.";
        }
        if (!parent.first_name || !parent.last_name || !parent.email || !parent.phone_num || !parent.password) {
            return "Parent fields are missing.";
        }
        if (selectedSessions.length === 0) {
            return "Select at least one session (day/time).";
        }
        return null;
    }

    async function handleSubmit() {
        const err = validate();
        if (err) {
            setMsgType("error");
            setMsg(err);
            return;
        }

        setLoading(true);
        setMsg("");
        setMsgType("info");

        try {
            // 1) Create parent user (role must be parent)
            const parentPayload = {
                ...parent,
                role: "parent",
            };

            // ✅ adjust to your route (example: /newUser)
            const parentRes = await api.post("/newUser", parentPayload);
            const parent_id =
                parentRes?.data?.user?.user_id ??
                parentRes?.data?.user?.id ??
                parentRes?.data?.user_id;

            if (!parent_id) {
                throw new Error("Parent created, but response missing user_id. Return it from newUser.");
            }

            // 2) Create student
            // ✅ adjust to your route (example: /newStudent)
            const studentRes = await api.post("/addStudent", student);

            // ⚠️ you MUST return student_id from backend to proceed cleanly
            const student_id =
                studentRes?.data?.student?.student_id ??
                studentRes?.data?.student_id ??
                studentRes?.data?.id;

            if (!student_id) {
                throw new Error(
                    "Student created, but response missing student_id. Update newStudent to return it."
                );
            }

            // 3) Link guardian
            // ✅ adjust to your route for assignGuardian
            await api.post(`/assign-guardian/${student_id}`, { parent_id });

            // 4) Enroll student into selected sessions
            // ✅ adjust to your enroll route shape:
            // your controller uses params.session_id and body.student_id
            for (const session_id of selectedSessions) {
                await api.post(`/session-enrollment/enroll/${session_id}`, { student_id });
            }

            setMsgType("success");
            setMsg(
                `Enrollment completed: Student ${student_id} linked to Parent ${parent_id} and enrolled in ${selectedSessions.length} session(s).`
            );
            resetForm();
        } catch (e) {
            const text = e?.response?.data?.message || e.message || "Enrollment failed.";
            setMsgType("error");
            setMsg(text);
        } finally {
            setLoading(false);
        }
    }

    // nav handlers (same as your Students page)
    const handleLogin = () => navigate("/loginPage");
    const handleDirectory = () => navigate("/directory");
    const handleDashboard = () => navigate("/dashboard");
    const handleSchedule = () => navigate("/schedule");
    const handleRequestsPages = () => navigate("/requests");
    const handleAttendancePage = () => navigate("/attendance");
    const handleStudentPage = () => navigate("/students");
    const handleEnrollment = () => navigate("/enrollment");

    return (
        <div className="enrollment-page">
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

                    <main className="main-content">
                        <div className="card">
                            <div className="enroll-top">
                                <div className="enroll-title">
                                    <h2>Enroll a Student</h2>
                                    <p className="muted">
                                        Create student + parent, link them, then pick days/times.
                                    </p>
                                </div>
                            </div>

                            {msg ? (
                                <div className={`notice ${msgType}`}>
                                    {msg}
                                </div>
                            ) : null}

                            <div className="form-grid">
                                {/* Student */}
                                <section className="panel">
                                    <div className="panel-head">
                                        <h3>Student Info</h3>
                                    </div>

                                    <div className="fields">
                                        <label>
                                            <span>First name</span>
                                            <input
                                                value={student.first_name}
                                                onChange={(e) => setStudent((s) => ({ ...s, first_name: e.target.value }))}
                                                placeholder="Student first name"
                                            />
                                        </label>

                                        <label>
                                            <span>Last name</span>
                                            <input
                                                value={student.last_name}
                                                onChange={(e) => setStudent((s) => ({ ...s, last_name: e.target.value }))}
                                                placeholder="Student last name"
                                            />
                                        </label>

                                        <label>
                                            <span>Grade</span>
                                            <input
                                                value={student.grade}
                                                onChange={(e) => setStudent((s) => ({ ...s, grade: e.target.value }))}
                                                placeholder="e.g. 5"
                                            />
                                        </label>
                                    </div>
                                </section>

                                {/* Parent */}
                                <section className="panel">
                                    <div className="panel-head">
                                        <h3>Parent/Guardian Info</h3>
                                    </div>

                                    <div className="fields">
                                        <label>
                                            <span>First name</span>
                                            <input
                                                value={parent.first_name}
                                                onChange={(e) => setParent((p) => ({ ...p, first_name: e.target.value }))}
                                                placeholder="Parent first name"
                                            />
                                        </label>

                                        <label>
                                            <span>Last name</span>
                                            <input
                                                value={parent.last_name}
                                                onChange={(e) => setParent((p) => ({ ...p, last_name: e.target.value }))}
                                                placeholder="Parent last name"
                                            />
                                        </label>

                                        <label>
                                            <span>Email</span>
                                            <input
                                                value={parent.email}
                                                onChange={(e) => setParent((p) => ({ ...p, email: e.target.value }))}
                                                placeholder="parent@email.com"
                                            />
                                        </label>

                                        <label>
                                            <span>Phone</span>
                                            <input
                                                value={parent.phone_num}
                                                onChange={(e) => setParent((p) => ({ ...p, phone_num: e.target.value }))}
                                                placeholder="555-555-5555"
                                            />
                                        </label>

                                        <label>
                                            <span>Password</span>
                                            <input
                                                type="password"
                                                value={parent.password}
                                                onChange={(e) => setParent((p) => ({ ...p, password: e.target.value }))}
                                                placeholder="Temporary password"
                                            />
                                        </label>
                                    </div>
                                </section>
                            </div>

                            {/* Sessions */}
                            <section className="panel sessions-panel">
                                <div className="panel-head row">
                                    <h3>Days / Times</h3>
                                    <div className="session-search">
                                        <input
                                            value={q}
                                            onChange={(e) => setQ(e.target.value)}
                                            placeholder="Search sessions (Mon, 4:00pm, tutor…)"
                                        />
                                    </div>
                                </div>

                                <div className="sessions-list">
                                    {filteredSessions.map((s) => {
                                        const id = s.session_id ?? s.id;
                                        const checked = selectedSessions.includes(id);
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                className={`session-chip ${checked ? "selected" : ""}`}
                                                onClick={() => toggleSession(id)}
                                            >
                                                <div className="chip-main">
                                                    <div className="chip-title">
                                                        {s.day} {formatTime(s.start_time)} – {formatTime(s.end_time)}
                                                    </div>
                                                    <div className="chip-sub muted">
                                                        ID: {id}
                                                        {s.tutor_name ? ` • Tutor: ${s.tutor_name}` : ""}
                                                    </div>
                                                </div>
                                                <div className="chip-check">{checked ? "✓" : "+"}</div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="selected-bar">
                                    <span className="muted">{selectedSessions.length} selected</span>
                                    <button
                                        type="button"
                                        className="link-btn"
                                        onClick={() => setSelectedSessions([])}
                                        disabled={selectedSessions.length === 0}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </section>

                            {/* Actions */}
                            <div className="actions">
                                <button className="btn secondary" onClick={resetForm} disabled={loading}>
                                    Reset
                                </button>
                                <button className="btn primary" onClick={handleSubmit} disabled={loading}>
                                    {loading ? "Submitting..." : "Submit Enrollment"}
                                </button>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}

function formatSession(s) {
    const day = s.day ?? s.weekday ?? "Day";
    const start = s.start_time ?? s.start ?? "";
    const end = s.end_time ?? s.end ?? "";
    return `${day} ${start}${end ? `–${end}` : ""}`;
}
