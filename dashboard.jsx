const { Plus, Trash2, RefreshCw, History } = window.lucide;

class Dashboard extends React.Component {
  state = {
    requests: [],
    monthlyHistory: {},
    currentMonth: this.getCurrentMonthKey(),
    loading: true,
    syncing: false,
    showHistory: false,
    newTitle: '',
    newDesc: ''
  }

  MONTHLY_BUDGET = 12;

  getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  getMonthDisplay(monthKey) {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  componentDidMount() {
    this.load();
    setInterval(() => this.load(), 30000);
  }

  load = async () => {
    try {
      this.setState({ syncing: true });
      const res = await fetch(window.GOOGLE_SCRIPT_URL + '?action=getAll&t=' + Date.now(), { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.setState({ 
          requests: data.requests || [], 
          monthlyHistory: data.history || {},
          currentMonth: data.settings.current_month || this.getCurrentMonthKey()
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.setState({ syncing: false, loading: false });
    }
  }

  add = async () => {
    if (!this.state.newTitle) return;
    const fd = new URLSearchParams();
    fd.append('action', 'addRequest');
    fd.append('data', JSON.stringify({ 
      title: this.state.newTitle, 
      description: this.state.newDesc, 
      status: 'pending',
      estimatedHours: null,
      approvedMonth: null
    }));
    await fetch(window.GOOGLE_SCRIPT_URL, { method: 'POST', body: fd });
    this.setState({ newTitle: '', newDesc: '' });
    this.load();
  }

  del = async (id) => {
    if (!confirm('Delete?')) return;
    const fd = new URLSearchParams();
    fd.append('action', 'deleteRequest');
    fd.append('id', id);
    await fetch(window.GOOGLE_SCRIPT_URL, { method: 'POST', body: fd });
    this.load();
  }

  render() {
    const { requests, loading, syncing, showHistory, monthlyHistory, currentMonth } = this.state;

    // Calculate budget usage
    const approvedHours = requests
      .filter(r => r.ApprovedMonth === currentMonth && (r.Status === 'approved' || r.Status === 'finished' || r.Status === 'archived'))
      .reduce((sum, r) => sum + (parseFloat(r.EstimatedHours) || 0), 0);
    
    const remainingHours = this.MONTHLY_BUDGET - approvedHours;
    const budgetPercentage = (approvedHours / this.MONTHLY_BUDGET) * 100;

    if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#f8fafc,#e2e8f0)'}}>
      <h2 style={{color:'#003e51'}}>Loading...</h2>
    </div>;

    return <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#f8fafc,#e2e8f0)',padding:'32px'}}>
      <div style={{maxWidth:'1200px',margin:'0 auto'}}>
        
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'32px'}}>
          <div>
            <h1 style={{fontSize:'36px',fontWeight:'bold',color:'#003e51',marginBottom:'8px'}}>CI Hours Dashboard</h1>
            <p style={{color:'#717271'}}>🎉 Collaborative mode with Budget Tracking</p>
          </div>
          <button onClick={this.load} disabled={syncing} style={{padding:'12px 24px',background:syncing?'#717271':'#007299',color:'white',border:'none',borderRadius:'8px',cursor:syncing?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:'8px',height:'fit-content'}}>
            <RefreshCw size={18} />
            {syncing ? 'Syncing...' : 'Refresh'}
          </button>
        </div>

        {/* BUDGET TRACKER - NEW! */}
        <div style={{background:'white',borderRadius:'12px',padding:'24px',marginBottom:'24px',boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
            <div>
              <h2 style={{fontSize:'24px',fontWeight:'600',color:'#003e51'}}>Monthly Budget</h2>
              <p style={{fontSize:'14px',color:'#717271'}}>{this.getMonthDisplay(currentMonth)}</p>
            </div>
            <div style={{display:'flex',gap:'16px',alignItems:'center'}}>
              <button 
                onClick={() => this.setState({showHistory: !showHistory})} 
                style={{padding:'8px 16px',background:'#717271',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',gap:'6px'}}
              >
                <History size={16} />
                {showHistory ? 'Hide' : 'View'} History
              </button>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'32px',fontWeight:'bold',color:'#003e51'}}>{remainingHours.toFixed(1)}h</div>
                <div style={{fontSize:'14px',color:'#717271'}}>remaining of {this.MONTHLY_BUDGET}h</div>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div style={{width:'100%',height:'24px',background:'#e5e7eb',borderRadius:'12px',overflow:'hidden',marginBottom:'8px'}}>
            <div style={{
              height:'100%',
              width:`${Math.min(budgetPercentage,100)}%`,
              background: budgetPercentage > 90 ? '#ff8300' : budgetPercentage > 70 ? '#ff8300' : '#007299',
              transition:'width 0.5s ease'
            }} />
          </div>
          
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px',color:'#717271'}}>
            <span>Approved: {approvedHours.toFixed(1)}h</span>
            <span>{budgetPercentage.toFixed(0)}% used</span>
          </div>

          {/* Monthly History */}
          {showHistory && Object.keys(monthlyHistory).length > 0 && (
            <div style={{marginTop:'24px',paddingTop:'24px',borderTop:'2px solid #e5e7eb'}}>
              <h3 style={{fontSize:'18px',fontWeight:'600',color:'#003e51',marginBottom:'16px'}}>Previous Months</h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'12px'}}>
                {Object.entries(monthlyHistory).sort(([a],[b]) => b.localeCompare(a)).map(([month, hours]) => (
                  <div key={month} style={{padding:'16px',background:'#f3f4f6',borderRadius:'8px'}}>
                    <div style={{fontSize:'14px',fontWeight:'600',color:'#003e51',marginBottom:'8px'}}>
                      {this.getMonthDisplay(month)}
                    </div>
                    <div style={{display:'flex',alignItems:'baseline',gap:'8px',marginBottom:'8px'}}>
                      <span style={{fontSize:'24px',fontWeight:'bold',color:'#007299'}}>{hours.toFixed(1)}h</span>
                      <span style={{fontSize:'12px',color:'#717271'}}>/ {this.MONTHLY_BUDGET}h</span>
                    </div>
                    <div style={{width:'100%',height:'8px',background:'#e5e7eb',borderRadius:'4px',overflow:'hidden'}}>
                      <div style={{
                        height:'100%',
                        width:`${Math.min((hours/this.MONTHLY_BUDGET)*100,100)}%`,
                        background:'#007299'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showHistory && Object.keys(monthlyHistory).length === 0 && (
            <div style={{marginTop:'24px',paddingTop:'24px',borderTop:'2px solid #e5e7eb',textAlign:'center',color:'#717271'}}>
              No previous month data available
            </div>
          )}
        </div>

        {/* Add Request Form */}
        <div style={{background:'white',borderRadius:'12px',padding:'24px',marginBottom:'24px',boxShadow:'0 4px 12px rgba(0,0,0,0.08)',borderLeft:'4px solid #007299'}}>
          <h2 style={{fontSize:'20px',fontWeight:'600',color:'#003e51',marginBottom:'16px'}}>Add Request</h2>
          <input 
            type="text" 
            placeholder="Title"
            value={this.state.newTitle}
            onChange={(e) => this.setState({newTitle: e.target.value})}
            style={{width:'100%',padding:'12px',marginBottom:'12px',border:'2px solid #e5e7eb',borderRadius:'8px',boxSizing:'border-box'}}
          />
          <textarea 
            placeholder="Description"
            value={this.state.newDesc}
            onChange={(e) => this.setState({newDesc: e.target.value})}
            rows={3}
            style={{width:'100%',padding:'12px',marginBottom:'16px',border:'2px solid #e5e7eb',borderRadius:'8px',boxSizing:'border-box',fontFamily:'inherit',resize:'vertical'}}
          />
          <button onClick={this.add} disabled={!this.state.newTitle||syncing} style={{padding:'12px 24px',background:!this.state.newTitle||syncing?'#d1d5db':'#007299',color:'white',border:'none',borderRadius:'8px',cursor:!this.state.newTitle||syncing?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:'8px'}}>
            <Plus size={18} />
            Submit
          </button>
        </div>

        {/* All Requests */}
        <div style={{background:'white',borderRadius:'12px',padding:'24px',boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
          <h2 style={{fontSize:'20px',fontWeight:'600',color:'#003e51',marginBottom:'16px'}}>All Requests ({requests.length})</h2>
          {requests.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px',color:'#717271'}}>
              <p style={{fontSize:'16px',marginBottom:'8px'}}>📭 No requests yet</p>
              <p style={{fontSize:'14px'}}>Add your first request above!</p>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {requests.map(r => (
                <div key={r.ID} style={{padding:'16px',border:'2px solid #e5e7eb',borderLeft:'4px solid #007299',borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'start'}}>
                  <div style={{flex:1}}>
                    <h3 style={{fontSize:'16px',fontWeight:'600',color:'#003e51',marginBottom:'6px'}}>{r.Title}</h3>
                    {r.Description && <p style={{fontSize:'14px',color:'#717271',marginBottom:'8px',lineHeight:'1.5'}}>{r.Description}</p>}
                    <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                      <span style={{display:'inline-block',padding:'4px 12px',background:'#e6f4ea',color:'#007299',borderRadius:'12px',fontSize:'12px',fontWeight:'600'}}>
                        {r.Status || 'pending'}
                      </span>
                      {r.EstimatedHours && (
                        <span style={{fontSize:'12px',color:'#717271',fontWeight:'600'}}>
                          {r.EstimatedHours}h
                        </span>
                      )}
                      {r.ApprovedMonth && (
                        <span style={{fontSize:'12px',color:'#007299',fontWeight:'600'}}>
                          Approved: {this.getMonthDisplay(r.ApprovedMonth)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => this.del(r.ID)} style={{padding:'8px 16px',background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',fontWeight:'600',marginLeft:'16px'}}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div style={{marginTop:'24px',padding:'20px',background:'#dbeafe',borderRadius:'8px',borderLeft:'4px solid #007299'}}>
          <p style={{color:'#003e51',fontSize:'14px',fontWeight:'600',marginBottom:'8px'}}>
            ✨ Budget Tracking Added!
          </p>
          <p style={{color:'#1e3a8a',fontSize:'14px',lineHeight:'1.6'}}>
            • Your 12-hour monthly budget is now tracked automatically<br/>
            • Budget resets on the 1st of each month<br/>
            • View history to see past months' usage<br/>
            • Next up: Workflow stages (Pending → Estimated → Approved → Finished)
          </p>
        </div>

      </div>
    </div>;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);
