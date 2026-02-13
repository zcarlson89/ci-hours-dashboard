// Working Basic Dashboard - Google Sheets Version
(function() {
  const React = window.React;
  const { useState, useEffect } = React;
  const { Plus, Trash2, RefreshCw, CheckCircle } = window.lucide;
  
  function Dashboard() {
    const GOOGLE_SCRIPT_URL = window.GOOGLE_SCRIPT_URL;
    const MONTHLY_BUDGET = 12;
    
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    
    // Load data
    const loadData = async () => {
      try {
        setSyncing(true);
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAll&t=${Date.now()}`, {
          method: 'POST'
        });
        const result = await response.json();
        
        if (result.success) {
          setRequests(result.requests || []);
        } else {
          console.error('Error:', result.error);
        }
      } catch (error) {
        console.error('Load error:', error);
      } finally {
        setSyncing(false);
        setLoading(false);
      }
    };
    
    // Add request
    const addRequest = async () => {
      if (!newTitle.trim()) return;
      
      try {
        setSyncing(true);
        const formData = new URLSearchParams();
        formData.append('action', 'addRequest');
        formData.append('data', JSON.stringify({
          title: newTitle,
          description: newDescription,
          status: 'pending'
        }));
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          body: formData
        });
        const result = await response.json();
        
        if (result.success) {
          setNewTitle('');
          setNewDescription('');
          await loadData();
        }
      } catch (error) {
        console.error('Add error:', error);
        alert('Error adding request');
      } finally {
        setSyncing(false);
      }
    };
    
    // Delete request
    const deleteRequest = async (id) => {
      if (!confirm('Delete this request?')) return;
      
      try {
        setSyncing(true);
        const formData = new URLSearchParams();
        formData.append('action', 'deleteRequest');
        formData.append('id', id);
        
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          body: formData
        });
        
        await loadData();
      } catch (error) {
        console.error('Delete error:', error);
      } finally {
        setSyncing(false);
      }
    };
    
    useEffect(() => {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }, []);
    
    if (loading) {
      return React.createElement('div', {
        style: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)' }
      },
        React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', { style: { width: '50px', height: '50px', border: '4px solid #e5e7eb', borderTopColor: '#007299', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' } }),
          React.createElement('p', { style: { marginTop: '20px', color: '#003e51', fontSize: '18px' } }, 'Loading Dashboard...')
        )
      );
    }
    
    return React.createElement('div', {
      style: { minHeight: '100vh', background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)', padding: '32px' }
    },
      React.createElement('div', { style: { maxWidth: '1200px', margin: '0 auto' } },
        // Header
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' } },
          React.createElement('h1', { style: { fontSize: '36px', fontWeight: 'bold', color: '#003e51' } }, 'CI Hours Dashboard'),
          React.createElement('button', {
            onClick: loadData,
            disabled: syncing,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: syncing ? '#717271' : '#007299',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: syncing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }
          },
            React.createElement(RefreshCw, { size: 18 }),
            syncing ? 'Syncing...' : 'Refresh'
          )
        ),
        
        // Add Request Form
        React.createElement('div', { style: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' } },
          React.createElement('h2', { style: { fontSize: '20px', fontWeight: '600', color: '#003e51', marginBottom: '16px' } }, 'Submit New Request'),
          React.createElement('input', {
            type: 'text',
            placeholder: 'Request title',
            value: newTitle,
            onChange: (e) => setNewTitle(e.target.value),
            style: {
              width: '100%',
              padding: '12px',
              marginBottom: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px'
            }
          }),
          React.createElement('textarea', {
            placeholder: 'Description (optional)',
            value: newDescription,
            onChange: (e) => setNewDescription(e.target.value),
            rows: 3,
            style: {
              width: '100%',
              padding: '12px',
              marginBottom: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'vertical'
            }
          }),
          React.createElement('button', {
            onClick: addRequest,
            disabled: !newTitle.trim() || syncing,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: !newTitle.trim() || syncing ? '#d1d5db' : '#007299',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: !newTitle.trim() || syncing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }
          },
            React.createElement(Plus, { size: 18 }),
            'Submit Request'
          )
        ),
        
        // Requests List
        React.createElement('div', { style: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' } },
          React.createElement('h2', { style: { fontSize: '20px', fontWeight: '600', color: '#003e51', marginBottom: '16px' } }, 
            'All Requests (', requests.length, ')'
          ),
          
          requests.length === 0 ? 
            React.createElement('p', { style: { textAlign: 'center', color: '#717271', padding: '40px' } }, 
              'No requests yet. Add your first request above!'
            ) :
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
              requests.map((request) => 
                React.createElement('div', {
                  key: request.ID,
                  style: {
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderLeft: '4px solid #007299',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start'
                  }
                },
                  React.createElement('div', { style: { flex: 1 } },
                    React.createElement('h3', { style: { fontSize: '16px', fontWeight: '600', color: '#003e51', marginBottom: '4px' } }, 
                      request.Title
                    ),
                    request.Description && React.createElement('p', { style: { fontSize: '14px', color: '#717271' } }, 
                      request.Description
                    ),
                    React.createElement('p', { style: { fontSize: '12px', color: '#717271', marginTop: '8px' } }, 
                      'Status: ', request.Status || 'pending'
                    )
                  ),
                  React.createElement('button', {
                    onClick: () => deleteRequest(request.ID),
                    style: {
                      padding: '8px',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }
                  }, 'Delete')
                )
              )
            )
        ),
        
        // Info banner
        React.createElement('div', { 
          style: { 
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#dbeafe',
            borderRadius: '8px',
            borderLeft: '4px solid #007299'
          }
        },
          React.createElement('p', { style: { color: '#003e51', fontSize: '14px' } },
            '✨ This is a basic version. You can add requests and see them sync across all users. Full features (estimates, comments, budget tracking) coming soon!'
          )
        )
      )
    );
  }
  
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(Dashboard));
})();
