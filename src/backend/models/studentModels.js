import pool from "../db/db.js";

const addStudent = async (first_name, last_name, grade) => {
    try {
        const result = await pool.query(
            `INSERT INTO students (first_name, last_name, grade) VALUES ($1, $2, $3) RETURNING *`,
            [first_name, last_name, grade]);
        return result.rows[0];
    } catch (error) {
        console.log("Error occured while adding student to db");
        throw error;
    }
}

const findByName = async (first_name, last_name) => {
    try {
        const result = await pool.query(
            `SELECT * FROM students WHERE first_name = $1 AND last_name = $2`,
            [first_name, last_name]);
        return result.rows[0]
    } catch (error) {
        console.log("Student was not found in DB");
        throw error;
    }
}
const findAllStudents = async () => {
    try {
        const result = await pool.query(`
        SELECT
        s.student_id,
        s.first_name,
        s.last_name,
        s.grade,
        COALESCE(
          json_agg(
            jsonb_build_object(
              'parent_id', u.user_id,
              'first_name', u.first_name,
              'last_name', u.last_name,
              'email', u.email,
              'phone', u.phone_num
            )
          ) FILTER (WHERE u.user_id IS NOT NULL),
          '[]'
        ) AS parents
      FROM students s
      LEFT JOIN parent_student ps ON ps.student_id = s.student_id
      LEFT JOIN users u ON u.user_id = ps.parent_id
      GROUP BY s.student_id
      ORDER BY s.last_name, s.first_name`);
        return result.rows;
    } catch (error) {
        console.log("Error occured while retrieiving student data");
        throw error;
    }
}
const findStudentByID = async (id) => {
    try {
        const result = await pool.query(
            `SELECT * FROM students WHERE student_id = $1`,
            [id]);
        return result.rows[0];
    } catch (error) {
        console.log("Error finding student")
        throw error;
    }
}
const updateStudentInfo = async (id, data) => {
    try {
        const fields = Object.keys(data);
        const values = Object.values(data);

        const setClause = fields.map((field, index) =>
            `${field}  = $${index + 1}`).join(", ");
        const query = `UPDATE students SET ${setClause} WHERE student_id = $${fields.length + 1}
            RETURNING student_id, first_name, last_name, grade`

        const result = await pool.query(query, [...values, id]);
        return result.rows[0];
    } catch (error) {
        console.log("Error occured while updating student information");
        throw error;
    }
}

const deleteStudent = async (id) => {
    try {
        const result = await pool.query(`DELETE FROM students WHERE student_id = $1
        RETURNING *`, [id]);
        return result.rows[0];
    } catch (error) {
        console.log("Error occured while deleting student");
        throw error;
    }
}


export default { addStudent, findByName, findAllStudents, findStudentByID, updateStudentInfo, deleteStudent };