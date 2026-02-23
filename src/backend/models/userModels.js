import pool from '../db/db.js' //import database connection 

// Find user by email 
const findByEmail = async (email) => {
    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        return result.rows[0];
    }
    catch (error) {
        console.log("Email not found", error);
        throw error;
    }
}

const findByUserID = async (id) => {
    try {
        const result = await pool.query("SELECT * FROM users WHERE user_id = $1", [id]);
        console.log(result.rows[0])
        return result.rows[0]; // returning user by their id value
    } catch (error) {
        console.log(`User with id ${id} is not found`);
        throw error;
    }
}

const findAllUsers = async () => {
    try {
        const result = await pool.query("SELECT first_name, last_name, email, phone_num, role FROM users")
        return result.rows; // returns all user rows 
    } catch (error) {
        console.log("Error occured while fetching user data", error);
        throw error;
    }
}

const addUser = async (first_name, last_name, email, hashed_password, phone_num, role) => {
    try {
        const result = await pool.query(
            `INSERT INTO users (first_name, last_name, email, password, phone_num, role) VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [first_name, last_name, email, hashed_password, phone_num, role]);
        return result.rows[0];
    } catch (error) {
        console.log("Error occured while adding user to DB");
        throw error;
    }
}

// Updating user data 
const updateData = async (id, data) => {
    try {
        const fields = Object.keys(data); // extracting from object 
        const values = Object.values(data);

        /// need to map fields.
        const setClause = fields.map((field, index) =>
            `${field} = $${index + 1}`).join(", ");

        const query = `UPDATE users SET ${setClause} WHERE user_id = $${fields.length + 1}
    RETURNING user_id, first_name, last_name, email, phone_num, role`

        const result = await pool.query(query, [...values, id]);
        return result.rows[0];

    } catch (error) {
        console.log(error);
        throw error;
    }
}

const deleteUser = async (id) => {
    try {
        const result = await pool.query(
            `DELETE FROM users WHERE user_id = $1 
            RETURNING user_id, first_name, last_name, email, phone_num, role`,
            [id]);
        return result.rows[0];
    } catch (error) {
        console.log("there was an error deleting the user", error);
    }
}

export default { findByEmail, findByUserID, addUser, findAllUsers, updateData, deleteUser };


