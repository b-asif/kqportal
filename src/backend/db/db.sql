
--1. USERS TABLE-- 
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY, 
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone_num TEXT NOT NULL,
    role VARCHAR(20) CHECK (role IN ('parent', 'admin', 'tutor')) NOT NULL
);
--2. STUDENT TABLE--
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    grade VARCHAR(50) NOT NULL
);
--3. PARENT STUDENT RELATIONSHIP--
CREATE TABLE parent_student (
    student_id INT REFERENCES students(student_id) on DELETE RESTRICT,
    parent_id INT REFERENCES users(user_id) on DELETE RESTRICT,
    PRIMARY KEY (student_id, parent_id)
);
--4. PROGRAM OPTIONS--
CREATE TABLE program_options (
    program_id SERIAL PRIMARY KEY,
    program_name VARCHAR(255) NOT NULL
);
--5. PROGRAMS STUDENTS ARE REGISTERED IN--
CREATE TABLE student_program  (
    student_id INT REFERENCES students(student_id),
    program_id INT REFERENCES program_options(program_id),
    PRIMARY KEY (student_id, program_id)
);
--6. STORING THE SESSION TIMES/DAYS--
CREATE TABLE session_tables (
    session_id SERIAL PRIMARY KEY,
    tutor_id INTEGER NOT NULL REFERENCES users(user_id),
    day VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_students INTEGER NOT NULL DEFAULT 3,
    CHECK (end_time > start_time)
);
--7. STUDENT SESSIONS--
CREATE TABLE student_session (
    student_id INT REFERENCES students(student_id),
    session_id INT REFERENCES session_tables(session_id),
    PRIMARY KEY (student_id, session_id)
);
--8. TRACKING ATTENDANCE--
CREATE TABLE attendance (
    session_instance_id INT REFERENCES student_session(session_instance_id),
    student_id INT REFERENCES students(student_id),
    status VARCHAR(20) CHECK (status IN ('absent', 'present', 'excused', 'makeup')) NOT NULL,
    notes TEXT,
    PRIMARY KEY (session_instance_id, student_id)
);
--9. CHANGING SCHEDULE--
CREATE TABLE schedule_change_request (
    request_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    requested_by INT REFERENCES users(user_id),
    req_change DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    requested_at TIMESTAMP DEFAULT NOW()
);
--10. MAKEUP REQUESTS--
CREATE TABLE makeup (
    makeup_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    missed_session INT REFERENCES student_session(session_instance_id),
    makeup_session INT REFERENCES student_session(session_instance_id) DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending'
);
--11. MESSAGES--
CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES users(user_id),
    recipient_id INT REFERENCES users(user_id),
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW()
);
--12. NOTIFICATIONS- 
CREATE TABLE notifications(
    notification_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

--13. SESSION INSTANCE--
CREATE TABLE session_instances (
    instance_id SERIAL PRIMARY KEY,
    session_id INT REFERENCES session_tables(session_id),
    session_date DATE NOT NULL,
    UNIQUE (session_id, session_date)
    status VARCHAR(20) DEFAULT 'scheduled'
)