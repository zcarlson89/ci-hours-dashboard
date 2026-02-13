// Dashboard - Class Component (Browser Compatible)
class Dashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      requests: [],
      loading: true,
      syncing: false,
      newTitle: '',
      newDescription: ''
    };
    this.GOOGLE_SCRIPT_URL = window.GOOGLE_SCRIPT_URL;
  }

  componentDidMount() {
    this.loadData();
    this.interval = setInterval(() => this.loadData(), 30000);
  }

  componentWillUnmount() {
    if (this.interval) clearInterval(this.interval);
  }

  loadData = async () => {
    try {
      this.setState({ syncing: true });
      const response = await fetch(this.GOOGLE_SCRIPT_URL + '?action=getAll&t=' + Date.now(), {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        this.setState({ requests: result.requests || [] });
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      this.setState({ syncing: false, loading: false });
    }
  }

  addRequest = async () => {
    const { newTitle, newDescription } = this.state;
    if (!newTitle.trim()) return;
    
    try {
      this.setState({ syncing: true });
      const formData = new URLSearchParams();
      formData.append('action', 'addRequest');
      formData.append('data', JSON.stringify({
        title: newTitle,
        description: newDescription,
        status: 'pending'
      }));
      
      const response = await fetch(this.GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      
      if (result.success) {
        this.setState({ newTitle: '', newDescription: '' });
        await this.loadData();
      }
    } catch (error) {
      console.error('Add error:', error);
      alert('Error adding request');
    } finally {
      this.setState({ syncing: false });
    }
  }

  deleteRequest = async (id) => {
    if (!confirm('Delete this request?')) return;
    
    try {
      this.setState({ syncing: true });
      const formData = new URLSearchParams();
      formData.append('action', 'deleteRequest');
      formData.append('id', id);
      
      await fetch(this.GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: formData
      });
      
      await this.loadData();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      this.setState({ syncing: false });
    }
  }

  render() {
    const { requests, loading, syncing, newTitle, newDescription } = this.state;
    const { Plus, Trash2, RefreshCw } = window.lucide;

    if (loading) {
      return React.createElement('div', {
        style: { 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
        }
      },
        React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('p', { 
            style: { marginTop: '20px', color: '#003e51', fontSize: '18px' } 
          }, 'Loading Dashboard...')
        )
      );
    }

    return React.createElement('div', {
      style: { 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
        padding: '32px' 
      }
    },
      React.createElement('div', { style: { maxWidth: '1200px', margin: '0 auto' } },
        // Header
        React.createElement('div', { 
          style: { 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '32px' 
          } 
        },
          React.createElement('div', null,
            React.createElement('h1', { 
              style: { fontSize: '36px', fontWeight: 'bold', color: '#003e51', marginBottom: '8px' } 
            }, 'Continuous Improvement Hours Dashboard'),
            React.createElement('p', { 
              style: { color: '#717271', fontSize: '16px' } 
            }, '🎉 Collaborative mode - All changes sync automatically')
          ),
          React.createElement('button', {
            onClick: this.loadData,
            disabled: syncing,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: syncing ? '#717271' : '#007299',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: syncing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }
          },
            React.createElement(RefreshCw, { size: 18 }),
            syncing ? 'Syncing...' : 'Refresh'
          )
        ),
        
        // Add Request Form
        React.createElement('div', { 
          style: { 
            backgroundColor: 'white', 
            borderRadius: '12px', 
            padding: '24px', 
            marginBottom: '24px', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            borderLeft: '4px solid #007299'
          } 
        },
          React.createElement('h2', { 
            style: { fontSize: '20px', fontWeight: '600', color: '#003e51', marginBottom: '16px' } 
          }, '➕ Submit New Request'),
          
          React.createElement('input', {
            type: 'text',
            placeholder: 'Request title *',
            value: newTitle,
            onChange: (e) => this.setState({ newTitle: e.target.value }),
            style: {
              width: '100%',
              padding: '12px 16px',
              marginBottom: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }
          }),
          
          React.createElement('textarea', {
            placeholder: 'Description (optional)',
            value: newDescription,
            onChange: (e) => this.setState({ newDescription: e.target.value }),
            rows: 3,
            style: {
              width: '100%',
              padding: '12px 16px',
              marginBottom: '16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'vertical',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }
          }),
          
          React.createElement('button', {
            onClick: this.addRequest,
            disabled: !newTitle.trim() || syncing,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: !newTitle.trim() || syncing ? '#d1d5db' : '#007299',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: !newTitle.trim() || syncing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }
          },
            React.createElement(Plus, { size: 18 }),
            'Submit Request'
          )
        ),
        
        // Requests List
        React.createElement('div', { 
          style: { 
            backgroundColor: 'white', 
            borderRadius: '12px', 
            padding: '24px', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)' 
          } 
        },
          React.createElement('h2', { 
            style: { fontSize: '20px', fontWeight: '600', color: '#003e51', marginBottom: '16px' } 
          }, '📋 All Requests (' + requests.length + ')'),
          
          requests.length === 0 ? 
            React.createElement('div', { 
              style: { textAlign: 'center', padding: '60px 20px', color: '#717271' } 
            },
              React.createElement('p', { style: { fontSize: '16px', marginBottom: '8px' } }, '📭 No requests yet'),
              React.createElement('p', { style: { fontSize: '14px' } }, 'Add your first request above!')
            ) :
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
              requests.map((request) => 
                React.createElement('div', {
                  key: request.ID,
                  style: {
                    padding: '16px 20px',
                    border: '2px solid #e5e7eb',
                    borderLeft: '4px solid #007299',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start'
                  }
                },
                  React.createElement('div', { style: { flex: 1 } },
                    React.createElement('h3', { 
                      style: { fontSize: '16px', fontWeight: '600', color: '#003e51', marginBottom: '6px' } 
                    }, request.Title),
                    
                    request.Description && React.createElement('p', { 
                      style: { fontSize: '14px', color: '#717271', marginBottom: '8px', lineHeight: '1.5' } 
                    }, request.Description),
                    
                    React.createElement('div', {
                      style: {
                        display: 'inline-block',
                        padding: '4px 12px',
                        backgroundColor: '#e6f4ea',
                        color: '#007299',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }
                    }, request.Status || 'pending')
                  ),
                  
                  React.createElement('button', {
                    onClick: () => this.deleteRequest(request.ID),
                    style: {
                      padding: '8px 16px',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      marginLeft: '16px'
                    }
                  }, '🗑️ Delete')
                )
              )
            )
        ),
        
        // Success banner
        React.createElement('div', { 
          style: { 
            marginTop: '24px',
            padding: '20px',
            backgroundColor: '#d1fae5',
            borderRadius: '8px',
            borderLeft: '4px solid #10b981'
          }
        },
          React.createElement('p', { 
            style: { color: '#065f46', fontSize: '14px', fontWeight: '600', marginBottom: '4px' } 
          }, '✅ SUCCESS! Your dashboard is working!'),
          React.createElement('p', { 
            style: { color: '#059669', fontSize: '13px', lineHeight: '1.6' } 
          }, 'Try adding a request above. Open this URL in another browser to see it sync in real-time! Full features coming soon.')
        )
      )
    );
  }
}

// Render
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(Dashboard));
