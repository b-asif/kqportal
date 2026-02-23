import hashing from "./hashing.js";

async function testing() {
    const password = "password123";

    const hash = await hashing.hashPassword(password);
    console.log("Hashed password is: ", hash);
    const incorrect = "password"
    const isMatched = await hashing.comparePasswords(incorrect, hash)
    console.log("Passwords matched? ", isMatched)
}

testing()