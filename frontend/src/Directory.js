import React, { useEffect, useState } from "react";
import "./Directory.css";
import { useNavigate } from "react-router-dom";
import api from "./api.js";

import kqlogo from "./kqlogo.png";
import dash from "./dashboard.png";
import contacts from "./contacts.png";
import calendar from "./calendar.png";
import requests from "./requests.png";
import att from "./person.png";
import logout from "./logout.png";
import students from "./students.png";
import enroll from "./enroll.png";
import people from "./people.png";

function Directory() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    const [tutors, setTutors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [sideBarOpen, setSideBarOpen] = useState(true);

    // ✅ Modal state
    const [editOpen, setEditOpen] = useState(false);
    const [editingTutor, setEditingTutor] = useState(null);
    const [editForm, setEditForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone_num: ""
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    const handleLogin = () => navigate("/loginPage");
    const handleDirectory = () => navigate("/directory");
    const handleDashboard = () => navigate("/dashboard");
    const handleSchedule = () => navigate("/schedule");
    const handleRequestsPages = () => navigate("/requests");
    const handleAttendancePage = () => navigate("/attendance");
    const handleStudentPage = () => navigate("/students");
    const handleEnrollment = () => navigate("/enrollment");

    useEffect(() => {
        const loadTutors = async () => {
            try {
                setLoading(true);
                setError("");

                const res = await api.get("/viewAllUsers/");
                const data = Array.isArray(res.data) ? res.data : [];

                const tutorOnly = data.filter((u) => String(u.role).toLowerCase() === "tutor");
                setTutors(tutorOnly);
            } catch (e) {
                console.error("Failed to load tutors", e.response?.status, e.response?.data || e);
                setError("Failed to load tutors.");
                setTutors([]);
            } finally {
                setLoading(false);
            }
        };

        loadTutors();
    }, []);

    // ✅ open modal and prefill form
    const openEdit = (tutor) => {
        const id =
            tutor.user_id ??
            tutor.id ??
            tutor.tutor_id ??
            tutor._id ??
            tutor.userId ??
            tutor.user?.id ??
            tutor.user?.user_id ??
            tutor.user?.tutor_id;

        const first = tutor.first_name ?? tutor.firstName ?? "";
        const last = tutor.last_name ?? tutor.lastName ?? "";
        const email = tutor.email ?? "";
        const phone = tutor.phone_num ?? tutor.phoneNumber ?? tutor.phone ?? "";

        setEditingTutor({ ...tutor, _id: id });
        setEditForm({
            first_name: first,
            last_name: last,
            email,
            phone_num: phone
        });
        setSaveError("");
        setEditOpen(true);
    };

    const closeEdit = () => {
        setEditOpen(false);
        setEditingTutor(null);
        setSaveError("");
    };
    const onChange = (field) => (e) => {
        setEditForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const saveEdit = async () => {
        console.log("SAVE CLICK", { editingTutor, editForm });

        if (!editingTutor?._id) {
            console.log("No tutor id found, aborting");
            return;
        }

        const tutorId = editingTutor._id;

        try {
            setSaving(true);
            setSaveError("");

            const payload = {
                first_name: editForm.first_name,
                last_name: editForm.last_name,
                email: editForm.email,
                phone_num: editForm.phone_num,
            };

            const res = await api.patch(`/update/${tutorId}/`, payload); // <-- try trailing slash
            console.log("UPDATE RESPONSE:", res.status, res.data);

            const updatedUser = res.data?.user ?? res.data;

            setTutors((prev) =>
                prev.map((t) => {
                    const tid = t.user_id ?? t.id ?? t.tutor_id;
                    return String(tid) === String(tutorId) ? { ...t, ...updatedUser } : t;
                })
            );

            closeEdit();
        } catch (e) {
            console.error("Save tutor edit failed:", e.response?.status, e.response?.data || e);
            setSaveError(e.response?.data?.message || "Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="directory">
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
                        <div className="tutor-directory">
                            <div className="tutor-header">
                                <img src={people} alt="Logo" className="logo" />
                                <h2>Tutor Directory</h2>
                            </div>
                            <h3>View all tutors and their availability status</h3>
                        </div>

                        <div className="card-box">
                            <div className="sub-header">
                                <h2>
                                    Tutors
                                    <br />
                                    directory
                                </h2>
                            </div>

                            {loading && <p>Loading tutors…</p>}
                            {error && <p>{error}</p>}

                            {!loading && !error && tutors.length === 0 && <p>No tutors found.</p>}

                            {!loading &&
                                !error &&
                                tutors.map((tutor) => {
                                    const id = tutor.user_id ?? tutor.id ?? tutor.tutor_id;
                                    const first = tutor.firstName ?? tutor.first_name ?? "";
                                    const last = tutor.lastName ?? tutor.last_name ?? "";
                                    const email = tutor.email ?? "";
                                    const phone = tutor.phoneNumber ?? tutor.phone_num ?? tutor.phone ?? "";

                                    const subsRaw = tutor.subjects ?? tutor.subject ?? [];
                                    const subjects = Array.isArray(subsRaw) ? subsRaw : subsRaw ? [subsRaw] : [];

                                    return (
                                        <React.Fragment key={id || `${email}-${first}-${last}`}>
                                            <div className="tutor-info">
                                                <div className="left-side">
                                                    <div className="contact-info">
                                                        <p className="name-1">
                                                            {first} {last}
                                                        </p>
                                                        <p className="info">
                                                            {email}
                                                            <br />
                                                            {phone}
                                                        </p>

                                                        <div className="subjects">
                                                            {subjects.map((subj) => (
                                                                <span key={subj} className="subject-tag">
                                                                    {subj}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="right-side">
                                                    <button className="action-btn" onClick={() => navigate(`/schedule?tutorId=${id}`)}>
                                                        View Schedule
                                                    </button>

                                                    <button
                                                        className="action-btn"
                                                        onClick={() => navigate(`/requests?type=substitution&tutorId=${id}`)}
                                                    >
                                                        Request Substitution
                                                    </button>

                                                    <button
                                                        className="action-btn"
                                                        onClick={() => (window.location.href = `mailto:${email}`)}
                                                        disabled={!email}
                                                    >
                                                        Contact
                                                    </button>

                                                    {/* ✅ EDIT opens modal */}
                                                    <button className="action-btn" onClick={() => openEdit(tutor)}>
                                                        Edit
                                                    </button>
                                                </div>
                                            </div>

                                            <hr className="border" />
                                        </React.Fragment>
                                    );
                                })}
                        </div>
                    </main>
                </div>
            </div>

            {/* ✅ MODAL */}
            {editOpen && (
                <div className="modal-overlay" onClick={closeEdit}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-title">Edit Tutor</div>

                        <div className="modal-form">
                            <label>
                                First name
                                <input value={editForm.first_name} onChange={onChange("first_name")} />
                            </label>

                            <label>
                                Last name
                                <input value={editForm.last_name} onChange={onChange("last_name")} />
                            </label>

                            <label>
                                Email
                                <input value={editForm.email} onChange={onChange("email")} />
                            </label>

                            <label>
                                Phone
                                <input value={editForm.phone_num} onChange={onChange("phone_num")} />
                            </label>

                            {saveError && <div className="modal-error">{saveError}</div>}
                        </div>

                        <div className="modal-actions">
                            <button className="modal-btn ghost" onClick={closeEdit} disabled={saving}>
                                Cancel
                            </button>
                            <button className="modal-btn primary" onClick={saveEdit} disabled={saving}>
                                {saving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Directory;