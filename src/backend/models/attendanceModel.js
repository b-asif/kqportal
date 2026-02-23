import pool from "../db/db.js";

const VALID_STATUS = ["present", "absent", "excused", "makeup"];

const markAbsence = async (sessionID, studentID, status, notes = null) => {
    if (!sessionID || !studentID || !status) {
        throw new Error("sessionID, studentID and status are required");
    }
    if (!VALID_STATUS.includes(status)) {
        throw new Error("Invalid status provided. Please enter present, absent or excused.");
    }
    try {
        const result = await pool.query(
            `INSERT INTO attendance (session_instance_id, student_id, status, notes)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (session_instance_id, student_id)
            DO UPDATE SET 
                status = EXCLUDED.status,
                notes = EXCLUDED.notes
            RETURNING session_instance_id, student_id, status, notes`,
            [sessionID, studentID, status, notes]
        );
        return result.rows[0];
    } catch (error) {
        console.log("There was an error that occured while marking student attendance.");
        throw error;
    }
}

const getAttendanceBySessionInstance = async (instanceId) => {
    try {
        const result = await pool.query(
            `SELECT a.session_instance_id, 
            a.student_id, 
            a.status, 
            s.first_name, 
            s.last_name
            FROM attendance a
            JOIN students s ON s.student_id = a.student_id
            WHERE a.session_instance_id = $1`,
            [instanceId]
        )
        return result.rows;

    } catch (error) {
        console.log("Error occured while fetching attendance record");
        throw error;
    }
}
const getStudentHoursSummary = async (studentID, startDate, endDate) => {
    const params = [studentID];
    let where = `WHERE ss.student_id = $1`;

    if (startDate && endDate) {
        params.push(startDate, endDate);
        where += ` AND si.session_date BETWEEN $2::date AND $3::date`;
    }

    // We join student_session -> session_instances (the schedule instances)
    // LEFT JOIN attendance so missing attendance rows can be treated as "present".
    // Use COALESCE(a.status, 'present') so NULL (no row) becomes 'present'.
    const result = await pool.query(
        `
      SELECT
        -- total scheduled sessions in the range
        COUNT(*)::int AS total_scheduled,
        -- sessions treated as attended: COALESCE(a.status,'present') in ('present','makeup','present')
        COUNT(*) FILTER (WHERE COALESCE(a.status, 'present') IN ('present','makeup','present'))::int AS attended_hours,
        -- charged hours follow same logic (present & makeup count; absent/excused do not)
        COUNT(*) FILTER (WHERE COALESCE(a.status, 'present') IN ('present','makeup','present'))::int AS charged_hours,
        -- counts by explicit attendance rows (useful for UI)
        COUNT(a.session_instance_id) FILTER (WHERE a.status='present')::int AS present_count,
        COUNT(a.session_instance_id) FILTER (WHERE a.status='makeup')::int AS makeup_count,
        COUNT(a.session_instance_id) FILTER (WHERE a.status='absent')::int AS absent_count,
        COUNT(a.session_instance_id) FILTER (WHERE a.status='excused')::int AS excused_count
      FROM student_session ss
      JOIN session_instances si ON si.session_id = ss.session_id
      LEFT JOIN attendance a
        ON a.session_instance_id = si.session_instance_id
       AND a.student_id = ss.student_id
      ${where};
      `,
        params
    );

    const row = result.rows[0] || {};
    return {
        // hours are integer counts of sessions (1 session = 1 hour)
        hoursAttended: Number(row.attended_hours || 0),
        hoursCharged: Number(row.charged_hours || 0),
        totalScheduled: Number(row.total_scheduled || 0),
        counts: {
            present: Number(row.present_count || 0),
            makeup: Number(row.makeup_count || 0),
            absent: Number(row.absent_count || 0),
            excused: Number(row.excused_count || 0),
        },
    };
};


const getStudentAttendanceRecord = async (studentID) => {
    try {
        //look through attendance database. 
        const result = await pool.query(
            `SELECT
            si.session_instance_id,
            si.session_date,
            st.session_id,
            st.day,
            st.start_time,
            st.tutor_id,
            u.first_name AS tutor_first_name,
            u.last_name  AS tutor_last_name,
            COALESCE(a.status, 'scheduled') AS status,
            a.notes
          FROM student_session ss
          JOIN session_instances si ON si.session_id = ss.session_id
          JOIN session_tables st ON st.session_id = si.session_id
          JOIN users u ON u.user_id = st.tutor_id
          LEFT JOIN attendance a
            ON a.session_instance_id = si.session_instance_id
           AND a.student_id = ss.student_id
          WHERE ss.student_id = $1
          ORDER BY si.session_date ASC, st.start_time ASC;
          `,
            [studentID]
        );
        return result.rows;
    } catch (error) {
        console.log("Error occured while fetching attendance record");
        throw error;
    }
}
const getStudentMonthCalendar = async (studentID, startDate, endDate) => {
    try {
        const result = await pool.query(
            `
        SELECT
          si.session_instance_id,
          si.session_date,
          st.session_id,
          st.day,
          st.start_time,
  
          COALESCE(a.status, 'scheduled') AS status,
          a.notes
        FROM student_session ss
        JOIN session_instances si ON si.session_id = ss.session_id
        JOIN session_tables st ON st.session_id = si.session_id
        LEFT JOIN attendance a
          ON a.session_instance_id = si.session_instance_id
         AND a.student_id = ss.student_id
        WHERE ss.student_id = $1
          AND si.session_date BETWEEN $2::date AND $3::date
        ORDER BY si.session_date ASC, st.start_time ASC;
        `,
            [studentID, startDate, endDate]
        );

        return result.rows;
    } catch (error) {
        console.log("Error fetching month calendar attendance.");
        throw error;
    }
};


const studentAttendanceDateRange = async (studentID, startDate, endDate) => {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            throw new Error("Invalid date entry. Use YYYY-MM-DD");
        }
        if (start > end) {
            throw new Error("start date must be before end date.");
        }
        const result = await pool.query(
            `SELECT a.session_instance_id,
            a.student_id,
            a.status,
            si.session_date
            FROM attendance a
            JOIN session_instances si ON si.session_instance_id = a.session_instance_id
            WHERE a.student_id = $1
            AND si.session_date BETWEEN $2::date AND $3::date
            ORDER BY si.session_date DESC;`,
            [studentID, startDate, endDate]
        );
        return result.rows
    } catch (error) {
        console.log("Error occured while fetching attendance record");
        throw error;
    }
}
const deleteEntry = async (instanceID, studentID) => {
    try {
        const result = await pool.query(
            `DELETE FROM attendance WHERE session_instance_id = $1 AND student_id = $2
            RETURNING session_instance_id, student_id, status, notes;`,
            [instanceID, studentID]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.log("Error occured while fetching attendance record");
        throw error;
    }
}

const updateAttendance = async (instanceID) => {

}

export default { markAbsence, getAttendanceBySessionInstance, getStudentAttendanceRecord, studentAttendanceDateRange, deleteEntry, getStudentHoursSummary, getStudentMonthCalendar };