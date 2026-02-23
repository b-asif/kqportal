import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./StudentProfile.css";
import api from "./api";

import kqlogo from "./kqlogo.png";
import dash from "./dashboard.png";
import contacts from "./contacts.png";
import calendar from "./calendar.png";
import requests from "./requests.png";
import att from "./person.png";
import logout from "./logout.png";
import studentIcon from "./students.png";
import enroll from "./enroll.png";

function formatTime(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    const hour12 = h % 12 || 12;
    const ampm = h >= 12 ? "PM" : "AM";
    return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatSession(s) {
    const day = s.day ?? s.weekday ?? "";
    const start = s.start_time ?? "";
    const end = s.end_time ?? "";
    const t = `${day} ${formatTime(start)}${end ? `–${formatTime(end)}` : ""}`;
    const tutor = s.tutor_first_name ? ` • ${s.tutor_first_name} ${s.tutor_last_name}` : "";
    return t + tutor;
}

export default function StudentProfile() {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();

    const [sideBarOpen, setSideBarOpen] = useState(true);
    const [user, setUser] = useState(null);

    const [student, setStudent] = useState(location.state?.student ?? null);
    const [parents, setParents] = useState([]);
    const [schedule, setSchedule] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [selectedSessions, setSelectedSessions] = useState(new Set());

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("info");

    // edit student form
    const [edit, setEdit] = useState({ first_name: "", last_name: "", grade: "" });
    const dirty = useMemo(() => {
        if (!student) return false;
        return (
            edit.first_name !== (student.first_name ?? "") ||
            edit.last_name !== (student.last_name ?? "") ||
            String(edit.grade) !== String(student.grade ?? "")
        );
    }, [edit, student]);

    // Load admin/user name
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

    // Load student profile + parents + schedule + sessions
    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setMsg("");

            try {
                // ✅ You likely have GET /students/:id or similar. Adjust these endpoints:
                const studentRes = await api.get(`/getStudent/${id}`);
                if (cancelled) return;
                const s = studentRes.data?.student ?? studentRes.data;
                setStudent(s);

                setEdit({
                    first_name: s.first_name ?? "",
                    last_name: s.last_name ?? "",
                    grade: s.grade ?? "",
                });

                // ✅ If your /getStudents already returns parents, you can reuse it.
                // Otherwise add an endpoint like /students/:id/parents
                const parentsRes = await api.get(`/parent/parentOfStudent/${id}`);
                if (!cancelled) setParents(parentsRes.data?.parents ?? parentsRes.data ?? []);

                // ✅ Your schedule endpoint (you already have something like /students/:id/schedule)
                const schedRes = await api.get(`/viewStudentSchedule/schedule/${id}`);
                const sched = schedRes.data?.schedule ?? schedRes.data ?? [];
                if (!cancelled) setSchedule(sched);

                // sessions list for picker
                const sessionsRes = await api.get("/getSessions");
                const all = Array.isArray(sessionsRes.data) ? sessionsRes.data : (sessionsRes.data.sessions || []);
                if (!cancelled) setSessions(all);

                // preselect current schedule sessions
                const currentIds = new Set(sched.map((x) => x.session_id ?? x.id));
                setSelectedSessions(currentIds);
            } catch (e) {
                if (!cancelled) {
                    setMsgType("error");
                    setMsg(e?.response?.data?.message || "Failed to load student profile.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [id]);

    function toggleSession(session_id) {
        setSelectedSessions((prev) => {
            const next = new Set(prev);
            if (next.has(session_id)) next.delete(session_id);
            else next.add(session_id);
            return next;
        });
    }

    async function saveStudentInfo() {
        setMsg("");
        setMsgType("info");
        try {
            const payload = {
                first_name: edit.first_name,
                last_name: edit.last_name,
                grade: edit.grade,
            };

            // ✅ your controller updateInfo route:
            // PUT /students/:id or PATCH /students/:id
            const res = await api.put(`/students/${id}`, payload);

            const updated = res.data?.student ?? res.data;
            setStudent((s) => ({ ...(s || {}), ...updated }));
            setMsgType("success");
            setMsg("Student info updated.");
        } catch (e) {
            setMsgType("error");
            setMsg(e?.response?.data?.message || "Failed to update student info.");
        }
    }

    async function saveSchedule() {
        setMsg("");
        setMsgType("info");
        try {
            const session_ids = Array.from(selectedSessions);

            await api.put(`/students/${id}/schedule`, { session_ids });

            // reload schedule view
            const schedRes = await api.get(`/students/${id}/schedule`);
            const sched = schedRes.data?.schedule ?? schedRes.data ?? [];
            setSchedule(sched);

            setMsgType("success");
            setMsg("Schedule updated.");
        } catch (e) {
            setMsgType("error");
            setMsg(e?.response?.data?.message || "Failed to update schedule.");
        }
    }

    async function deleteStudent() {
        const ok = window.confirm("Delete this student profile? This cannot be undone.");
        if (!ok) return;

        setMsg("");
        setMsgType("info");

        try {
            // ✅ You'll need DELETE /students/:id
            await api.delete(`/deleteStudent/${id}`);
            setMsgType("success");
            setMsg("Student deleted.");
            navigate("/students");
        } catch (e) {
            setMsgType("error");
            setMsg(e?.response?.data?.message || "Failed to delete student.");
        }
    }

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
        <div className="student-profile-page">
            <div className={`app-shell ${sideBarOpen ? "sidebar-open" : "sidebar-closed"}`}>
                <nav className="header">
                    <button className="sidebar-toggle" onClick={() => setSideBarOpen((v) => !v)}>☰</button>
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
                            <img src={studentIcon} className="logo-1" alt="" />
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
                            <div className="profile-top">
                                <button className="btn" onClick={() => navigate(-1)}>← Back</button>
                                <div className="profile-title">
                                    <h2>{student ? `${student.first_name} ${student.last_name}` : "Student Profile"}</h2>
                                    
                                </div>
                                <button className="btn danger" onClick={deleteStudent}>Delete</button>
                            </div>

                            {msg ? <div className={`notice ${msgType}`}>{msg}</div> : null}
                            {loading ? <div className="muted">Loading…</div> : null}

                            <div className="profile-grid">
                                {/* Student Info */}
                                <section className="panel">
                                    <div className="panel-head">
                                        <h3>Student Info</h3>
                                    </div>

                                    <div className="fields">
                                        <label>
                                            <span>First name</span>
                                            <input value={edit.first_name} onChange={(e) => setEdit((p) => ({ ...p, first_name: e.target.value }))} />
                                        </label>
                                        <label>
                                            <span>Last name</span>
                                            <input value={edit.last_name} onChange={(e) => setEdit((p) => ({ ...p, last_name: e.target.value }))} />
                                        </label>
                                        <label>
                                            <span>Grade</span>
                                            <input value={edit.grade} onChange={(e) => setEdit((p) => ({ ...p, grade: e.target.value }))} />
                                        </label>
                                    </div>

                                    <div className="actions">
                                        <button className="btn primary" onClick={saveStudentInfo} disabled={!dirty}>
                                            Save Student Info
                                        </button>
                                    </div>
                                </section>

                                {/* Parent Info */}
                                <section className="panel">
                                    <div className="panel-head">
                                        <h3>Parent / Guardian</h3>
                                    </div>

                                    {parents.length === 0 ? (
                                        <div className="muted">No parent linked.</div>
                                    ) : (
                                        <div className="parent-list">
                                            {parents.map((p) => (
                                                <div key={p.parent_id ?? p.user_id} className="parent-card">
                                                    <div className="parent-name">{p.first_name} {p.last_name}</div>
                                                    <div className="parent-sub">{p.email ?? "—"}{p.phone_num ? ` • ${p.phone_num}` : ""}</div>
                                                    {/* You can add edit button once you have endpoints */}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="actions">
                                        <button
                                            className="btn"
                                            onClick={() => alert("Parent update UI can be added once you expose a parent update endpoint.")}
                                        >
                                            Update Parent Info
                                        </button>
                                    </div>
                                </section>
                            </div>

                            {/* Schedule */}
                            <section className="panel schedule-panel">
                                <div className="panel-head row">
                                    <h3>Schedule</h3>
                                    <button className="btn primary" onClick={saveSchedule}>
                                        Save Schedule
                                    </button>
                                </div>

                                <div className="schedule-two">
                                    <div className="schedule-col">
                                        <div className="muted head">Current schedule</div>
                                        {schedule.length === 0 ? (
                                            <div className="muted">No sessions assigned.</div>
                                        ) : (
                                            <div className="chips">
                                                {schedule.map((s) => (
                                                    <div key={s.session_id ?? s.id} className="chip">
                                                        {formatSession(s)}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="schedule-col">
                                        <div className="muted head">Select sessions</div>
                                        <div className="session-picker">
                                            {sessions.map((s) => {
                                                const sid = s.session_id ?? s.id;
                                                const checked = selectedSessions.has(sid);
                                                return (
                                                    <button
                                                        key={sid}
                                                        type="button"
                                                        className={`session-chip ${checked ? "selected" : ""}`}
                                                        onClick={() => toggleSession(sid)}
                                                    >
                                                        <div className="chip-main">
                                                            <div className="chip-title">{formatSession(s)}</div>
                                                            <div className="chip-sub muted">ID: {sid}</div>
                                                        </div>
                                                        <div className="chip-check">{checked ? "✓" : "+"}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="profile-bottom">
                                <button className="btn" onClick={() => navigate(`/students/${id}/attendance`)}>
                                    View Attendance Calendar
                                </button>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
