import React from 'react';
import Header from '../components/layout/Header';

const Dependencies = () => {
  return (
    <div style={{ backgroundColor: '#0D0D0D', color: '#E8E8E8', minHeight: '100vh', padding: '20px' }}>
      <Header />
      <h2 style={{ color: '#C6A664' }}>Dependencies</h2>
      <form style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label>
          Fedapay API Key:
          <input type="text" name="fedapayApiKey" style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #3A3A3A', backgroundColor: '#1A1A1A', color: '#E8E8E8' }} />
        </label>
        <label>
          Supabase URL:
          <input type="text" name="supabaseUrl" style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #3A3A3A', backgroundColor: '#1A1A1A', color: '#E8E8E8' }} />
        </label>
        <label>
          Supabase Key:
          <input type="text" name="supabaseKey" style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #3A3A3A', backgroundColor: '#1A1A1A', color: '#E8E8E8' }} />
        </label>
        <label>
          Render PostgreSQL URL:
          <input type="text" name="renderPostgresUrl" style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #3A3A3A', backgroundColor: '#1A1A1A', color: '#E8E8E8' }} />
        </label>
        <button type="submit" style={{ backgroundColor: '#C6A664', color: '#0D0D0D', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>Save</button>
      </form>
    </div>
  );
};

export default Dependencies;
