import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config({ quiet: true })

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization']
    console.log('verifyToken authHeader:', authHeader);
    if (!authHeader) {
        return res.status(401).send("Missing header");
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).send("Missing token")
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_KEY, (err, user) => {
        console.log('jwt.verify callback err:', err, 'user:', user);
        if (err) {
            return res.status(403).send(err.message || "token has expired") //forbidden access
        }
        req.user = user;
        next();
    });
}
export default verifyToken;