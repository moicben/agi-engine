import React, { useEffect, useState } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetch('/api/tracking/stats').then(r=>r.json()).then(json => {
      if (json.success) setStats(json.stats || {});
    });
  }, []);

  return (
    <div className="container">
      <h1>Dashboard</h1>
      <ul>
        <li>Visites: {stats.visit || 0}</li>
        <li>Soumissions: {stats.submission || 0}</li>
        <li>Login visits: {stats.login_visit || 0}</li>
        <li>Logins: {stats.login || 0}</li>
        <li>Vérifications démarrées: {stats.verification_start || 0}</li>
        <li>Vérifications réussies: {stats.verification_success || 0}</li>
        <li>Vérifications échouées: {stats.verification_failed || 0}</li>
      </ul>
    </div>
  );
}
