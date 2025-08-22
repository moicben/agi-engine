import { useState } from 'react';

export default function WhatsAppControl() {
  const [singleDevice, setSingleDevice] = useState('5562');
  const [batchDevices, setBatchDevices] = useState('5554,5556,5558,5560');
  const [session, setSession] = useState('+17539011190');
  const [brand, setBrand] = useState('3');
  const [style, setStyle] = useState('simple');
  const [campaign, setCampaign] = useState('6');
  const [count, setCount] = useState('3');
  const [log, setLog] = useState('');

  async function run(body) {
    setLog('⏳ Running...');
    try {
      const res = await fetch('/api/whatsapp/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const out = [
        `CMD: ${data.command || ''}`,
        data.success ? '✅ Success' : '❌ Failure',
        data.stdout ? `\n[stdout]\n${data.stdout}` : '',
        data.stderr ? `\n[stderr]\n${data.stderr}` : '',
        data.error ? `\n[error]\n${data.error}` : '',
      ].join('\n');
      setLog(out);
    } catch (e) {
      setLog('❌ ' + e.message);
    }
  }

  const cardStyle = {
    background: '#0B0B0C',
    border: '1px solid #1E1E22',
    borderRadius: 12,
    padding: 16,
  };

  const inputStyle = { width: '100%', background: '#121214', border: '1px solid #2A2A31', color: '#EDEDED', padding: 8, borderRadius: 8 };
  const labelStyle = { display: 'grid', gap: 6 };
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };
  const grid = { display: 'grid', gap: 12 };
  const button = { background: '#2F66F5', color: '#fff', border: 'none', padding: '10px 12px', borderRadius: 10, cursor: 'pointer' };
  const buttonGhost = { background: 'transparent', color: '#EDEDED', border: '1px solid #2A2A31', padding: '10px 12px', borderRadius: 10, cursor: 'pointer' };

  return (
    <div style={{ padding: 24, fontFamily: 'Inter, system-ui, Arial', color: '#EDEDED', background: '#0A0A0B', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontWeight: 600 }}>WhatsApp Orchestrator</h2>
      </div>

      <div style={grid2}>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Single device</h3>
          <div style={grid}>
            <label style={labelStyle}>Device
              <input placeholder="5562" value={singleDevice} onChange={e => setSingleDevice(e.target.value)} style={inputStyle}/>
            </label>
            <label style={labelStyle}>Session (+phone)
              <input placeholder="+17539011190" value={session} onChange={e => setSession(e.target.value)} style={inputStyle}/>
            </label>
            <div style={grid2}>
              <label style={labelStyle}>Brand id
                <input placeholder="3" value={brand} onChange={e => setBrand(e.target.value)} style={inputStyle}/>
              </label>
              <label style={labelStyle}>Style
                <select value={style} onChange={e => setStyle(e.target.value)} style={{ ...inputStyle, padding: 8 }}>
                  <option value="simple">simple</option>
                  <option value="full">full</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={buttonGhost} onClick={() => run({ workflow: 'import', device: singleDevice, session })}>Import</button>
              <button style={button} onClick={() => run({ workflow: 'brand', device: singleDevice, brand, style })}>Brand</button>
              <button style={buttonGhost} onClick={() => run({ workflow: 'update', device: singleDevice, session })}>Update</button>
            </div>

            <div style={{ color: '#8B8B92', fontSize: 12 }}>
              node tools/whatsapp/runner.js --workflow=import --device={singleDevice} --session={session}<br/>
              node tools/whatsapp/runner.js --workflow=brand --device={singleDevice} --brand={brand} --style={style}<br/>
              node tools/whatsapp/runner.js --workflow=update --device={singleDevice} --session={session}
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Batch</h3>
          <div style={grid}>
            <label style={labelStyle}>Devices (csv)
              <input placeholder="5554,5556,5558,5560" value={batchDevices} onChange={e => setBatchDevices(e.target.value)} style={inputStyle}/>
            </label>
            <label style={labelStyle}>Session (+phone)
              <input placeholder="+17539011190" value={session} onChange={e => setSession(e.target.value)} style={inputStyle}/>
            </label>
            <div style={grid2}>
              <label style={labelStyle}>Campaign id
                <input placeholder="6" value={campaign} onChange={e => setCampaign(e.target.value)} style={inputStyle}/>
              </label>
              <label style={labelStyle}>Count
                <input placeholder="3" value={count} onChange={e => setCount(e.target.value)} style={inputStyle}/>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={buttonGhost} onClick={() => run({ workflow: 'import', device: batchDevices, session })}>Import (batch)</button>
              <button style={button} onClick={() => run({ workflow: 'send', device: batchDevices, campaign, count })}>Send (batch)</button>
            </div>

            <div style={{ color: '#8B8B92', fontSize: 12 }}>
              node tools/whatsapp/runner.js --workflow=import --device={batchDevices} --session={session}<br/>
              node tools/whatsapp/runner.js --workflow=send --device={batchDevices} --campaign={campaign} --count={count}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Résultat</h3>
        <pre style={{ background: '#0B0B0C', border: '1px solid #1E1E22', color: '#EDEDED', padding: 12, minHeight: 220, whiteSpace: 'pre-wrap', borderRadius: 10 }}>{log}</pre>
      </div>
    </div>
  );
}


