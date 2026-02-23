import pool from "../db/db.js";

const createSession = async (tutor_id, day, start_time, end_time) => {
    const client = await pool.connect(); // running multiple queries 
    try {
        if (start_time >= end_time) {
            return { ok: false, status: 400, message: "start_time must be before end_time." };
        }
        // start of transaction 
        await client.query("BEGIN");
        const overLapCheck = await client.query(
            `SELECT 1
            FROM session_tables s
            WHERE s.tutor_id = $1
                AND s.day = $2
                AND s.start_time < $4
                AND s.end_time > $3
            LIMIT 1;`,
            [tutor_id, day, start_time, end_time]
        );
        if (overLapCheck.rowCount > 0) {
            await client.query("ROLLBACK");
            return {
                ok: false,
                status: 409,
                message: "Schedule conflict, tutor already has a session scheduled during this time frame."
            }
        }
        const result = await client.query(
            `INSERT INTO session_tables (tutor_id, day, start_time, end_time) 
            VALUES ($1, $2, $3, $4) RETURNING *`,
            [tutor_id, day, start_time, end_time]
        );
        await client.query("COMMIT");
        return { ok: true, status: 201, session: result.rows[0] };
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("There was an error creating a session:", error.message);
        throw error;
    } finally {
        client.release();
    }
}

const findAllSessions = async () => {
    try {
        const result = await pool.query(
            `SELECT s.session_id, s.day, s.start_time, s.end_time,
            u.user_id AS tutor_id,
            u.first_name, u.last_name 
            FROM session_tables s 
            JOIN users u ON s.tutor_id = u.user_id
            ORDER BY s.day, s.start_time`)
        return result.rows;
    } catch (error) {
        console.log("There was an error finding the sessions", error);
        throw error;
    }
}

const findSessionByTutorId = async (id) => {
    try {
        const request = await pool.query(`SELECT * FROM session_tables WHERE tutor_id = $1`, [id]);
        return request.rows[0];
    } catch (error) {
        console.log("Error finding the tutor sessions");
        throw error;
    }
}

const findSession = async (id) => {
    try {
        const request = await pool.query(`SELECT * FROM session_tables WHERE session_id = $1`, [id]);
        return request.rows[0];
    } catch (error) {
        console.log("There was error finding session", error);
        throw error;
    }
}

const updateSession = async (id, data) => {
    try {
        const fields = Object.keys(data);
        const vals = Object.values(data);
        const setClause = fields.map((field, index) =>
            `${field}  = $${index + 1}`).join(", ");
        const query = `UPDATE session_tables SET ${setClause}
            WHERE session_id = $${fields.length + 1}
            RETURNING session_id, day, start_time, end_time, tutor_id`

        const result = await pool.query(query, [...vals, id]);
        return result.rows[0];
    } catch (error) {
        console.log("error updating session info");
        throw error;
    }
}

const deleteSession = async (id) => {
    try {
        const result = await pool.query(`DELETE FROM session_tables WHERE session_id = $1
            RETURNING *`,
            [id]);
        return result.rows[0];
    } catch (error) {
        console.log("Error occured while deleting session");
        throw error;
    }
}

const findSessionForWeek = async () => {
    try {
        const result = await pool.query(
            `SELECT s.day,
                st.student_id,
                st.first_name AS student_first_name,
                st.last_name  AS student_last_name,
                COALESCE(ss.attendance_status, 'present') AS attendance_status
         FROM session_tables s
         LEFT JOIN student_session ss ON s.session_id = ss.session_id
         LEFT JOIN students st ON ss.student_id = st.student_id
         ORDER BY s.day, st.last_name, st.first_name`
        );
        return result.rows;
    } catch (error) {
        console.log("Error finding sessions for the week", error);
        throw error;
    }
};

export default {
    createSession,
    findAllSessions,
    findSessionByTutorId,
    findSession,
    updateSession,
    deleteSession,
    findSessionForWeek
}