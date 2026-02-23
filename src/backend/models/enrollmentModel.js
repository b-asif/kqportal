import pool from "../db/db.js";

const enrollStudent = async (student_id, session_id) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // STEP 1 - lock the session row to avoid race conditions when checking capacity
        const sessionResult = await client.query(
            `SELECT max_students, day, start_time, end_time, duration_hours
         FROM session_tables
         WHERE session_id = $1
         FOR UPDATE`,
            [session_id]
        );

        if (sessionResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return { ok: false, status: 404, message: "Session not found" };
        }

        const sessionRow = sessionResult.rows[0];

        // STEP 2 - check if student already enrolled in this session
        const alreadyEnrolled = await client.query(
            `SELECT 1 FROM student_session WHERE student_id = $1 AND session_id = $2`,
            [student_id, session_id]
        );
        if (alreadyEnrolled.rowCount > 0) {
            await client.query("ROLLBACK");
            return { ok: true, status: 200, message: "Student is already enrolled in this session." };
        }

        // STEP 3 - check schedule overlap (existing sessions the student is enrolled in)
        const overLapCheck = await client.query(
            `SELECT 1
         FROM student_session ss
         JOIN session_tables existing ON existing.session_id = ss.session_id
         JOIN session_tables incoming ON incoming.session_id = $2
         WHERE ss.student_id = $1
           AND existing.day = incoming.day
           AND existing.start_time < incoming.end_time
           AND existing.end_time > incoming.start_time
         LIMIT 1;`,
            [student_id, session_id]
        );
        if (overLapCheck.rowCount > 0) {
            await client.query("ROLLBACK");
            return {
                ok: false,
                status: 409,
                message: "Schedule conflict, student already has a session scheduled during this time frame."
            };
        }

        // STEP 4 - check capacity (count current enrollments)
        const countResult = await client.query(
            `SELECT COUNT(*)::int AS enrolled
         FROM student_session WHERE session_id = $1`,
            [session_id]
        );
        const enrolled = countResult.rows[0].enrolled;
        const maxStudents = sessionRow.max_students;
        if (enrolled >= maxStudents) {
            await client.query("ROLLBACK");
            return { ok: false, status: 409, message: "Session is full" };
        }

        // ----------------------
        // NEW: Enrollment / Billing checks
        // ----------------------
        // Require an active enrollment that covers "today". If you'd prefer to use the session_date
        // or allow enrollment without active enrollment, change this logic.
        const asOfDateResult = await client.query(
            `SELECT enrollment_id, billing_type, hours_purchased, hourly_rate, start_date, end_date
         FROM student_enrollment
         WHERE student_id = $1
           AND start_date <= CURRENT_DATE
           AND end_date >= CURRENT_DATE
         ORDER BY start_date DESC
         LIMIT 1
         FOR UPDATE;`,
            [student_id]
        );

        if (asOfDateResult.rowCount === 0) {
            // No active enrollment found: don't allow enrollment; require admin/parent to create one.
            await client.query("ROLLBACK");
            return {
                ok: false,
                status: 400,
                message: "No active enrollment found for this student. Please create an enrollment (prepay or hourly) before adding sessions."
            };
        }

        const enrollment = asOfDateResult.rows[0];

        if (String(enrollment.billing_type).toLowerCase() === "prepay") {
            // Compute used hours in this enrollment window by summing charged_hours on attendance rows.
            // We sum charged_hours where the attendance falls within the enrollment window.
            // (If you track session_instance.session_date, you can join by that to be stricter.)
            const usageRes = await client.query(
                `SELECT COALESCE(SUM(charged_hours), 0)::numeric AS hours_used
           FROM attendance a
           LEFT JOIN session_instance si ON si.session_instance_id = a.session_instance_id
           WHERE a.student_id = $1
             AND (
               (si.session_date BETWEEN $2::date AND $3::date)
               OR (a.marked_at::date BETWEEN $2::date AND $3::date)
             );`,
                [student_id, enrollment.start_date, enrollment.end_date]
            );

            const hoursUsed = Number(usageRes.rows[0].hours_used || 0);
            const hoursPurchased = Number(enrollment.hours_purchased || 0);
            const hoursRemaining = Math.max(0, hoursPurchased - hoursUsed);

            if (hoursRemaining <= 0) {
                await client.query("ROLLBACK");
                return {
                    ok: false,
                    status: 409,
                    message: `Student has no remaining pre-paid hours (purchased ${hoursPurchased}, used ${hoursUsed}). Please purchase more hours or switch to hourly billing.`
                };
            }

            // Optionally: you could also check that the session's duration won't exhaust the remaining hours,
            // e.g. if session duration is 1.5 and hoursRemaining = 1, decide if you allow enrollment.
            // If you want to enforce that check, uncomment this block:
            /*
            const duration = Number(sessionRow.duration_hours) || 1;
            if (duration > hoursRemaining) {
              await client.query("ROLLBACK");
              return {
                ok: false,
                status: 409,
                message: `Not enough remaining hours for this session (session requires ${duration}h, remaining ${hoursRemaining}h).`
              };
            }
            */
        } else {
            // billing_type === 'hourly' => we allow enrollment; charges occur when attendance is marked.
            // No hours check required.
        }

        // STEP 5 - finally insert enrollment into student_session
        const insertRes = await client.query(
            `INSERT INTO student_session (student_id, session_id)
         VALUES ($1, $2)
         ON CONFLICT (student_id, session_id) DO NOTHING
         RETURNING *;`,
            [student_id, session_id]
        );

        await client.query("COMMIT");

        if (insertRes.rowCount === 0) {
            return { ok: true, status: 200, message: "Student already enrolled" };
        }
        return { ok: true, status: 201, message: "Enrollment successful" };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
// Retrieving the student scheudule (sessions)
const viewStudentSchedule = async (student_id) => {
    try {
        const result = await pool.query(
            `SELECT 
                s.session_id, s.day, s.start_time, s.end_time, s.tutor_id,
                u.first_name AS tutor_first_name,
                u.last_name AS tutor_last_name
            FROM student_session ss
            JOIN session_tables s ON s.session_id = ss.session_id
            JOIN users u ON u.user_id = s.tutor_id
            WHERE ss.student_id = $1
            ORDER BY
                CASE s.day
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                END,
            s.start_time`,
            [student_id]
        );
        return result.rows;
    } catch (error) {
        console.log("Error fetching student schedule. Please try again.")
        throw error;
    }
}
const deleteStudentSession = async (student_id, session_id) => {
    try {
        const result = await pool.query(
            `DELETE FROM student_session WHERE 
            student_id = $1 AND session_id = $2
            RETURNING *`,
            [student_id, session_id]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.log("Error occured while deleting session");
        throw error;
    }
}

// viewing all students in a specific session. 
const studentsInSession = async (session_id) => {
    try {
        const result = await pool.query(
            `SELECT st.student_id, st.first_name, st.last_name, st.grade
            FROM student_session ss
            JOIN students st ON st.student_id = ss.student_id
            WHERE ss.session_id = $1`,
            [session_id]
        );
        return result.rows;
    } catch (error) {
        console.log("Error occured while displaying students in session");
        throw error;
    }
}

const getActiveEnrollment = async (studentID, asOfDate = null) => {
    const date = asOfDate ? asOfDate : new Date().toISOString().slice(0, 10);

    const result = await pool.query(
        `
      SELECT enrollment_id, student_id, hours_purchased
      FROM student_enrollment
      WHERE student_id = $1
      LIMIT 1;
      `,
        [studentID, date]
    );

    return result.rows[0] || null;
};
const createStudentEnrollment = async (studentID, hoursPurchased) => {
    if (!studentID || !hoursPurchased) {
        throw new Error("studentID, hoursPurchased are required");
    }

    const result = await pool.query(
        `
      INSERT INTO student_enrollment (student_id, hours_purchased)
      VALUES ($1, $2::int)
      RETURNING enrollment_id, student_id, hours_purchased;
      `,
        [studentID, hoursPurchased]
    );

    return result.rows[0];
};

export default { enrollStudent, viewStudentSchedule, deleteStudentSession, studentsInSession, getActiveEnrollment, createStudentEnrollment }