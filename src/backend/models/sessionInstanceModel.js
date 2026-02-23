import pool from "../db/db.js";

// conversion of days to numbers
const dayToDow = (day) => ({
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6
}[day]);

const generateInstancesForRange = async (startDate, endDate) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN"); //start transaction

        const sessionRes = await client.query(
            `SELECT session_id, day FROM session_tables` // select each row in session_table
        );
        for (const s of sessionRes.rows) {
            const dow = dayToDow(s.day); //convert to number
            if (dow === undefined) continue;

            await client.query(
                `INSERT INTO session_instances (session_id, session_date)
                SELECT $1, d::date
                FROM generate_series($2::date, $3::date, interval '1 day') d
                WHERE EXTRACT(DOW FROM d) = $4
                ORDER BY d DESC
                ON CONFLICT (session_id, session_date) DO NOTHING;`,
                [s.session_id, startDate, endDate, dow]
            );
        }
        await client.query("COMMIT");
        return { ok: true, message: "Instances were generated successfully!" };
    }
    catch (error) {
        await client.query("ROLLBACK");
        console.log("Error occured while generating the session instance", error);
        throw error;
    } finally {
        client.release();
    }
}

const getScheduleForDate = async (date) => {
    if (!date) {
        throw new Error("date is required (YYYY-MM-DD)");
    }
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
        throw new Error("Invalid date provided. Use YYYY-MM-DD");
    }
    const result = await pool.query(
        `SELECT
            si.session_instance_id,
            si.session_id,
            si.session_date,
            
            s.day,
            s.start_time,
            s.end_time,
            s.tutor_id,
            
            u.first_name AS tutor_first_name,
            u.last_name AS tutor_last_name,
            
            COALESCE(
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'student_id', st.student_id,
                        'first_name', st.first_name,
                        'last_name', st.last_name,
                        'attendance_status', a.status
                    )
                    ORDER BY st.last_name, st.first_name
                ) FILTER (WHERE st.student_id IS NOT NULL),
                '[]'::json
            )AS students
        FROM session_instances si
        JOIN session_tables s ON s.session_id = si.session_id
        JOIN users u ON u.user_id = s.tutor_id
        LEFT JOIN student_session ss ON ss.session_id = si.session_id
        LEFT JOIN students st ON st.student_id = ss.student_id
        
        LEFT JOIN attendance a ON a.session_instance_id = si.session_instance_id
        AND a.student_id = st.student_id
        
        WHERE DATE(si.session_date) = $1::date
        
        GROUP BY
            si.session_instance_id,
            si.session_id,
            si.session_date,
            s.day, s.start_time, s.end_time,
            s.tutor_id,
            u.first_name, u.last_name
        
        ORDER BY s.start_time, si.session_id`,
        [date]
    );
    return result.rows;
}

export default { generateInstancesForRange, getScheduleForDate }