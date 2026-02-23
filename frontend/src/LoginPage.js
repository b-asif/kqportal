import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import api from "./api";
import './LoginPage.css';

function LoginPage() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post("/auth/login", {
        userEmail: email,
        password
      });

      const data = response.data;

      console.log("LOGIN RESPONSE DATA:", data);

      localStorage.setItem("token", data.token);
      
      console.log("Logged in!")
      navigate('/dashboard');

    } catch (err) {
      console.error("Failed to login: ", err);
      alert("An error occured during login, please try again");
    }
  };

  const handleForgetPassword = async (e) => {
    e.preventDefault();
  }

  const handleRegister = () => {
    navigate("/register");
  }
  return (
    <div className="Login">
      <header className="Login-header">
        <h1>KnowledgeQuest</h1>
        <p className="subText">the learning place</p>
      </header>

      <div className="login-box">
        <h2>Welcome Tutors</h2>
        <form onSubmit={handleLogin}>
          <input className="input" type="text" placeholder="Username or Email Address" value={email}
            onChange={(e) => setEmail(e.target.value)} />

          <input className="input" type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} />

          <div className="checkbox-container">
            <input type="checkbox" id="keepMeSignedIn"></input>
            <label htmlFor="keepMeSignedIn">Keep me signed in</label>
            <button onSubmit={handleForgetPassword} className="forgot">Forgot?</button>
          </div>
          <button type="submit" className="signIn">Sign In</button>
          <div className="new-account">
            <p>New Tutor</p>
            <button onClick={handleRegister} className="create-account">Create Account</button>
          </div>

        </form>
        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      </div>
    </div>
  );
}

export default LoginPage;