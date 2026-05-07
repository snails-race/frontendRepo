import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ScanInput.module.css';

export default function ScanInput() {
  const [url, setUrl] = useState('');
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  const handleScan = () => {
    if (!agreed) return;
    navigate('/scan/analysis');
  };

  return (
    <div className={styles.inputGroup}>
      <div className={styles.inputRow}>
        <input
          type="text"
          placeholder="https://www.example.com/video.mp4"
          aria-label="Video URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className={styles.iconBtn} aria-label="Upload File">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>
      </div>
      <div className={styles.actionRow}>
        <label className={styles.consent}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          I agree to terms of analysis
        </label>
        <button
          className={styles.btnPrimary}
          onClick={handleScan}
          disabled={!agreed}
        >
          SCAN NOW <span className={styles.beta}>BETA</span>
        </button>
      </div>
    </div>
  );
}
