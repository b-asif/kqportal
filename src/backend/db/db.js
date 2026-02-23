import dotenv from 'dotenv'
import pkg from 'pg'

const { Pool } = pkg
dotenv.config({ quiet: true });

// connecting the database to Node.js
const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    port: process.env.PG_PORT,
    password: process.env.PG_PASSWORD
});

//TEST CONNECTION
pool.query("SELECT NOW()", (err, result) => {
    if (err) {
        console.log("Database failed to connect");
    }
    else {
        console.log("Database has successfully connected!", result.rows[0].now)
    }
});

export default pool;



