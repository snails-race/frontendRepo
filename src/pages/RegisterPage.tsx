import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthBackground from '../components/common/AuthBackground';
import s from '../styles/auth.module.css';
import ls from './LoginPage.module.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Register:', { name, email });
  };

  return (
    <div className={ls.page}>
      <AuthBackground />

      <div className={ls.card}>
        <div className={ls.header}>
          <Link to="/" className={ls.logo}>
            <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
              <circle cx="9" cy="12" r="7" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="15" cy="12" r="7" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 4" />
            </svg>
            <span>Solomon AI</span>
          </Link>

          <h1>Create an account</h1>
          <p className={ls.subtitle}>Join Solomon AI to start analyzing</p>
        </div>

        <form className={ls.form} onSubmit={handleSubmit}>
          <div className={s.formGroup}>
            <label htmlFor="name" className={s.formLabel}>Full Name</label>
            <input
              type="text" id="name" className={s.formInput}
              placeholder="Enter your full name" required
              value={name} onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className={s.formGroup}>
            <label htmlFor="email" className={s.formLabel}>Email Address</label>
            <input
              type="email" id="email" className={s.formInput}
              placeholder="name@example.com" required
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={s.formGroup}>
            <label htmlFor="password" className={s.formLabel}>Password</label>
            <input
              type="password" id="password" className={s.formInput}
              placeholder="Create a password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <label className={s.checkboxGroup}>
            <input
              type="checkbox" required
              checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
            />
            <span className={s.checkboxLabel}>
              I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a> of Solomon AI.
            </span>
          </label>

          <button type="submit" className={ls.submitBtn}>Sign Up</button>
        </form>

        <div className={s.authFooter}>
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
