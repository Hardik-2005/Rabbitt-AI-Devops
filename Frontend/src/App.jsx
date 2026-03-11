import { useState } from 'react';
import { uploadSalesFile } from './api';
import './App.css';

function App() {
  const [file, setFile]       = useState(null);
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    if (!file) {
      setError('Please select a CSV or XLSX file.');
      return;
    }
    if (!email) {
      setError('Please enter a recipient email address.');
      return;
    }

    setLoading(true);
    try {
      await uploadSalesFile(file, email);
      setSuccess('✅ Sales summary generated and sent to ' + email);
      setFile(null);
      setEmail('');
      e.target.reset();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'An unexpected error occurred.';
      setError('❌ ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <span className="icon">📊</span>
          <h1>Sales Insight Automator</h1>
          <p className="subtitle">Upload your sales data and receive an AI-powered executive summary by email.</p>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label htmlFor="file">Sales File</label>
            <div className="file-input-wrapper">
              <input
                id="file"
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => setFile(e.target.files[0] || null)}
              />
              <span className="file-hint">Accepted formats: .csv, .xlsx · Max 5 MB</span>
            </div>
            {file && <span className="file-name">📎 {file.name}</span>}
          </div>

          <div className="field">
            <label htmlFor="email">Recipient Email</label>
            <input
              id="email"
              type="email"
              placeholder="e.g. ceo@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Generating Summary…' : 'Generate & Send Summary'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
