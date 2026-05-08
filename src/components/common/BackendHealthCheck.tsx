import { useEffect, useState } from 'react';
import { checkBackendHealth } from '../../lib/api';
import styles from './BackendHealthCheck.module.css';

type HealthState = 'checking' | 'connected' | 'failed';

export default function BackendHealthCheck() {
  const [healthState, setHealthState] = useState<HealthState>('checking');

  useEffect(() => {
    let isMounted = true;

    checkBackendHealth()
      .then((result) => {
        if (!isMounted) return;
        setHealthState(result.ok ? 'connected' : 'failed');
      })
      .catch(() => {
        if (!isMounted) return;
        setHealthState('failed');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={`${styles.badge} ${styles[healthState]}`} aria-live="polite">
      <span className={styles.dot} />
      {healthState === 'checking' && 'Health API checking'}
      {healthState === 'connected' && 'Health API connected'}
      {healthState === 'failed' && 'Health API failed'}
    </div>
  );
}
