const { Plus, Trash2, RefreshCw, History } = window.lucide;

class Dashboard extends React.Component {
  state = {
    requests: [],
    monthlyHistory: {},
    currentMonth: this.getCurrentMonthKey(),
    loading: true,
    syncing: false,
    showHistory: false,
    showArchived: false,
    deleteConfirmId: null,
    editingEstimate: null,
    estimateInput: '',
    editingCompletionDate: null,
    completionDateInput: '',
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

  apiCall = async (action, params = {}) => {
    this.setState({ syncing: true });
    try {
      const fd = new URLSearchParams();
      fd.append('action', action);
      Object.keys(params).forEach(key => {
        fd.append(key, typeof params[key] === 'object' ? JSON.stringify(params[key]) : params[key]);
      });
      const res = await fetch(window.GOOGLE_SCRIPT_URL, { method: 'POST', body: fd });
      const result = await res.json();
      if (result.success) {
        await this.load();
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      this.setState({ syncing: false });
    }
  }

  add = async () => {
    if (!this.state.newTitle) return;
    await this.apiCall('addRequest', {
      data: {
        title: this.state.newTitle, 
        description: this.state.newDesc, 
        status: 'pending'
      }
    });
    this.setState({ newTitle: '', newDesc: '' });
  }

  del = async (id) => {
    const { deleteConfirmId } = this.state;
    if (deleteConfirmId === id) {
      await this.apiCall('deleteRequest', { id });
      this.setState({ deleteConfirmId: null });
    } else {
      this.setState({ deleteConfirmId: id });
    }
  }

  addEstimate = async (id, hours) => {
    const { requests } = this.state;
    const request = requests.find(r => r.ID == id);
    const estimatedRequests = requests.filter(r => r.Status === 'estimated' || r.Status === 'approved');
    const maxPriority = estimatedRequests.length > 0 ? Math.max(...estimatedRequests.map(r => r.Priority || 0)) : 0;
    
    const success = await this.apiCall('updateRequest', {
      data: { ...request, Status: 'estimated', EstimatedHours: parseFloat(hours), Priority: maxPriority + 1 }
    });
    
    if (success) this.setState({ editingEstimate: null, estimateInput: '' });
  }

  approveRequest = async (id) => {
    const { requests, currentMonth } = this.state;
    const request = requests.find(r => r.ID == id);
    await this.apiCall('updateRequest', {
      data: { ...request, Status: 'approved', ApprovedMonth: currentMonth }
    });
  }

  addCompletionDate = async (id, date) => {
    const { requests } = this.state;
    const request = requests.find(r => r.ID == id);
    const success = await this.apiCall('updateRequest', {
      data: { ...request, EstimatedCompletionDate: date }
    });
    if (success) this.setState({ editingCompletionDate: null, completionDateInput: '' });
  }

  markAsDone = async (id) => {
    const { requests } = this.state;
    const request = requests.find(r => r.ID == id);
    await this.apiCall('updateRequest', {
      data: { ...request, Status: 'finished', CompletedDate: new Date().toLocaleDateString() }
    });
  }

  archiveRequest = async (id) => {
    const { requests } = this.state;
    const request = requests.find(r => r.ID == id);
    await this.apiCall('updateRequest', {
      data: { ...request, Status: 'archived' }
    });
  }

  movePriority = async (id, direction) => {
    const { requests } = this.state;
    const estimatedOnly = requests.filter(r => r.Status === 'estimated').sort((a, b) => a.Priority - b.Priority);
    const index = estimatedOnly.findIndex(r => r.ID == id);
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      const req1 = estimatedOnly[index];
      const req2 = estimatedOnly[index - 1];
      await this.apiCall('updateRequest', { data: { ...req1, Priority: req2.Priority } });
      await this.apiCall('updateRequest', { data: { ...req2, Priority: req1.Priority } });
    } else if (direction === 'down' && index < estimatedOnly.length - 1) {
      const req1 = estimatedOnly[index];
      const req2 = estimatedOnly[index + 1];
      await this.apiCall('updateRequest', { data: { ...req1, Priority: req2.Priority } });
      await this.apiCall('updateRequest', { data: { ...req2, Priority: req1.Priority } });
    }
  }

  render() {
    const { requests, loading, syncing, showHistory, showArchived, monthlyHistory, currentMonth, deleteConfirmId, editingEstimate, estimateInput, editingCompletionDate, completionDateInput } = this.state;

    const approvedHours = requests
      .filter(r => r.ApprovedMonth === currentMonth && (r.Status === 'approved' || r.Status === 'finished' || r.Status === 'archived'))
      .reduce((sum, r) => sum + (parseFloat(r.EstimatedHours) || 0), 0);
    
    const remainingHours = this.MONTHLY_BUDGET - approvedHours;
    const budgetPercentage = (approvedHours / this.MONTHLY_BUDGET) * 100;

    const pendingRequests = requests.filter(r => r.Status === 'pending');
    const estimatedRequests = requests.filter(r => r.Status === 'estimated').sort((a, b) => a.Priority - b.Priority);
    const approvedRequests = requests.filter(r => r.Status === 'approved').sort((a, b) => a.Priority - b.Priority);
    const finishedRequests = requests.filter(r => r.Status === 'finished');
    const archivedRequests = requests.filter(r => r.Status === 'archived').sort((a, b) => b.ID - a.ID);

    if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#f8fafc,#e2e8f0)'}}>
      <h2 style={{color:'#003e51'}}>Loading...</h2>
    </div>;

    return <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#f8fafc,#e2e8f0)',padding:'32px'}}>
      <div style={{maxWidth:'1400px',margin:'0 auto'}}>
        
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'32px'}}>
          <div>
            <h1 style={{fontSize:'36px',fontWeight:'bold',color:'#003e51',marginBottom:'8px'}}>Continuous Improvement Hours Dashboard</h1>
            <p style={{color:'#717271'}}>Track requests through workflow stages</p>
          </div>
          <button onClick={this.load} disabled={syncing} style={{padding:'12px 24px',background:syncing?'#717271':'#007299',color:'white',border:'none',borderRadius:'8px',cursor:syncing?'not-allowed':'pointer',height:'fit-content'}}>
            {syncing ? 'Syncing...' : '↻ Refresh'}
          </button>
        </div>

        {/* Budget Tracker */}
        <div style={{background:'white',borderRadius:'12px',padding:'24px',marginBottom:'24px',boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
            <div>
              <h2 style={{fontSize:'24px',fontWeight:'600',color:'#003e51'}}>Monthly Budget</h2>
              <p style={{fontSize:'14px',color:'#717271'}}>{this.getMonthDisplay(currentMonth)}</p>
            </div>
            <div style={{display:'flex',gap:'16px',alignItems:'center'}}>
              <button onClick={() => this.setState({showHistory: !showHistory})} style={{padding:'8px 16px',background:'#717271',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'14px'}}>
                {showHistory ? 'Hide' : 'View'} History
              </button>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'32px',fontWeight:'bold',color:'#003e51'}}>{remainingHours.toFixed(1)}h</div>
                <div style={{fontSize:'14px',color:'#717271'}}>remaining of {this.MONTHLY_BUDGET}h</div>
              </div>
            </div>
          </div>
          
          <div style={{width:'100%',height:'24px',background:'#e5e7eb',borderRadius:'12px',overflow:'hidden',marginBottom:'8px'}}>
            <div style={{height:'100%',width:`${Math.min(budgetPercentage,100)}%`,background:budgetPercentage>90?'#ff8300':budgetPercentage>70?'#ff8300':'#007299',transition:'width 0.5s ease'}} />
          </div>
          
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px',color:'#717271'}}>
            <span>Approved: {approvedHours.toFixed(1)}h</span>
            <span>{budgetPercentage.toFixed(0)}% used</span>
          </div>

          {showHistory && Object.keys(monthlyHistory).length > 0 && (
            <div style={{marginTop:'24px',paddingTop:'24px',borderTop:'2px solid #e5e7eb'}}>
              <h3 style={{fontSize:'18px',fontWeight:'600',color:'#003e51',marginBottom:'16px'}}>Previous Months</h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'12px'}}>
                {Object.entries(monthlyHistory).sort(([a],[b]) => b.localeCompare(a)).map(([month, hours]) => (
                  <div key={month} style={{padding:'16px',background:'#f3f4f6',borderRadius:'8px'}}>
                    <div style={{fontSize:'14px',fontWeight:'600',color:'#003e51',marginBottom:'8px'}}>{this.getMonthDisplay(month)}</div>
                    <div style={{display:'flex',alignItems:'baseline',gap:'8px',marginBottom:'8px'}}>
                      <span style={{fontSize:'24px',fontWeight:'bold',color:'#007299'}}>{hours.toFixed(1)}h</span>
                      <span style={{fontSize:'12px',color:'#717271'}}>/ {this.MONTHLY_BUDGET}h</span>
                    </div>
                    <div style={{width:'100%',height:'8px',background:'#e5e7eb',borderRadius:'4px',overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${Math.min((hours/this.MONTHLY_BUDGET)*100,100)}%`,background:'#007299'}} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Add New Request */}
        <div style={{background:'white',borderRadius:'12px',padding:'24px',marginBottom:'24px',boxShadow:'0 4px 12px rgba(0,0,0,0.08)',borderLeft:'4px solid #007299'}}>
          <h2 style={{fontSize:'20px',fontWeight:'600',color:'#003e51',marginBottom:'16px'}}>Submit New Request</h2>
          <input 
            type="text" 
            placeholder="Request title"
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
          <button onClick={this.add} disabled={!this.state.newTitle||syncing} style={{padding:'12px 24px',background:!this.state.newTitle||syncing?'#d1d5db':'#007299',color:'white',border:'none',borderRadius:'8px',cursor:!this.state.newTitle||syncing?'not-allowed':'pointer'}}>
            Submit Request
          </button>
        </div>

        {/* PENDING REQUESTS */}
        <div style={{background:'white',borderRadius:'12px',padding:'24px',marginBottom:'24px',boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
          <h2 style={{fontSize:'22px',fontWeight:'600',color:'#003e51',marginBottom:'16px'}}>⏳ Pending Estimates ({pendingRequests.length})</h2>
          {pendingRequests.length === 0 ? (
            <p style={{textAlign:'center',padding:'40px',color:'#717271'}}>No pending requests</p>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {pendingRequests.map(r => (
                <div key={r.ID} style={{padding:'16px',border:'2px solid #e5e7eb',borderLeft:'4px solid #ff8300',borderRadius:'8px'}}>
                  {deleteConfirmId === r.ID && (
                    <div style={{marginBottom:'12px',padding:'12px',background:'#fff3e0',borderLeft:'3px solid #ff8300',borderRadius:'4px'}}>
                      <p style={{fontSize:'14px',color:'#003e51',marginBottom:'8px'}}>Are you sure you want to delete this request?</p>
                      <div style={{display:'flex',gap:'8px'}}>
                        <button onClick={() => this.del(r.ID)} style={{padding:'6px 12px',background:'#ff8300',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'13px'}}>
                          Yes, Delete
                        </button>
                        <button onClick={() => this.setState({deleteConfirmId:null})} style={{padding:'6px 12px',background:'#e5e7eb',color:'#717271',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'13px'}}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
                    <div style={{flex:1}}>
                      <h3 style={{fontSize:'16px',fontWeight:'600',color:'#003e51',marginBottom:'6px'}}>{r.Title}</h3>
                      {r.Description && <p style={{fontSize:'14px',color:'#717271',marginBottom:'8px',lineHeight:'1.5'}}>{r.Description}</p>}
                    </div>
                    <button onClick={() => this.setState({deleteConfirmId:r.ID})} style={{padding:'8px 16px',background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',marginLeft:'16px'}}>
                      Delete
                    </button>
                  </div>
                  
                  {editingEstimate === r.ID ? (
                    <div style={{marginTop:'12px',display:'flex',gap:'8px'}}>
                      <input 
                        type="number" 
                        step="0.5"
                        placeholder="Hours"
                        value={estimateInput}
                        onChange={(e) => this.setState({estimateInput: e.target.value})}
                        style={{width:'100px',padding:'8px',border:'2px solid #e5e7eb',borderRadius:'6px'}}
                        autoFocus
                      />
                      <button onClick={() => this.addEstimate(r.ID, estimateInput)} disabled={!estimateInput} style={{padding:'8px 16px',background:!estimateInput?'#d1d5db':'#007299',color:'white',border:'none',borderRadius:'6px',cursor:!estimateInput?'not-allowed':'pointer',fontSize:'13px'}}>
                        Save
                      </button>
                      <button onClick={() => this.setState({editingEstimate:null,estimateInput:''})} style={{padding:'8px 16px',background:'#e5e7eb',color:'#717271',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => this.setState({editingEstimate: r.ID})} style={{marginTop:'12px',padding:'8px 16px',background:'#717271',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>
                      Add Estimate
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PRIORITIZED REQUESTS */}
        <div style={{background:'white',borderRadius:'12px',padding:'24px',marginBottom:'24px',boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
          <h2 style={{fontSize:'22px',fontWeight:'600',color:'#003e51',marginBottom:'16px'}}>⚡ Prioritized Requests ({estimatedRequests.length})</h2>
          {estimatedRequests.length === 0 ? (
            <p style={{textAlign:'center',padding:'40px',color:'#717271'}}>No estimated requests yet</p>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {estimatedRequests.map((r, index) => (
                <div key={r.ID} style={{padding:'16px',border:'2px solid #e5e7eb',borderLeft:'4px solid #717271',borderRadius:'8px'}}>
                  {deleteConfirmId === r.ID && (
                    <div style={{marginBottom:'12px',padding:'12px',background:'#fff3e0',borderLeft:'3px solid #ff8300',borderRadius:'4px'}}>
                      <p style={{fontSize:'14px',color:'#003e51',marginBottom:'8px'}}>Delete this request?</p>
                      <div style={{display:'flex',gap:'8px'}}>
                        <button onClick={() => this.del(r.ID)} style={{padding:'6px 12px',background:'#ff8300',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'13px'}}>Yes</button>
                        <button onClick={() => this.setState({deleteConfirmId:null})} style={{padding:'6px 12px',background:'#e5e7eb',color:'#717271',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'13px'}}>Cancel</button>
                      </div>
                    </div>
                  )}
                  
                  <div style={{display:'flex',gap:'12px',alignItems:'start'}}>
                    <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                      <button onClick={() => this.movePriority(r.ID, 'up')} disabled={index === 0} style={{padding:'4px',background:index===0?'#f3f4f6':'#e5e7eb',border:'none',borderRadius:'4px',cursor:index===0?'not-allowed':'pointer',fontSize:'16px'}}>
                        ▲
                      </button>
                      <button onClick={() => this.movePriority(r.ID, 'down')} disabled={index === estimatedRequests.length - 1} style={{padding:'4px',background:index===estimatedRequests.length-1?'#f3f4f6':'#e5e7eb',border:'none',borderRadius:'4px',cursor:index===estimatedRequests.length-1?'not-allowed':'pointer',fontSize:'16px'}}>
                        ▼
                      </button>
                    </div>
                    
                    <div style={{flex:1}}>
                      <h3 style={{fontSize:'16px',fontWeight:'600',color:'#003e51',marginBottom:'6px'}}>{r.Title}</h3>
                      {r.Description && <p style={{fontSize:'14px',color:'#717271',marginBottom:'8px',lineHeight:'1.5'}}>{r.Description}</p>}
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'12px'}}>
                        <span style={{fontSize:'14px',fontWeight:'600',color:'#003e51'}}>{r.EstimatedHours}h estimated</span>
                        <button 
                          onClick={() => this.approveRequest(r.ID)} 
                          disabled={remainingHours < r.EstimatedHours}
                          style={{padding:'8px 16px',background:remainingHours<r.EstimatedHours?'#d1d5db':'#007299',color:'white',border:'none',borderRadius:'6px',cursor:remainingHours<r.EstimatedHours?'not-allowed':'pointer',fontSize:'13px'}}
                        >
                          {remainingHours < r.EstimatedHours ? 'Insufficient Budget' : 'Approve'}
                        </button>
                      </div>
                    </div>
                    
                    <button onClick={() => this.setState({deleteConfirmId:r.ID})} style={{padding:'8px',background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* APPROVED REQUESTS */}
        <div style={{background:'white',borderRadius:'12px',padding:'24px',marginBottom:'24px',boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
          <h2 style={{fontSize:'22px',fontWeight:'600',color:'#003e51',marginBottom:'16px'}}>✅ Approved Requests ({approvedRequests.length})</h2>
          {approvedRequests.length === 0 ? (
            <p style={{textAlign:'center',padding:'40px',color:'#717271'}}>No approved requests</p>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {approvedRequests.map(r => (
                <div key={r.ID} style={{padding:'16px',border:'2px solid #e5e7eb',borderLeft:'4px solid #007299',borderRadius:'8px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:'12px'}}>
                    <div style={{flex:1}}>
                      <h3 style={{fontSize:'16px',fontWeight:'600',color:'#003e51',marginBottom:'6px'}}>{r.Title}</h3>
                      {r.Description && <p style={{fontSize:'14px',color:'#717271',marginBottom:'8px',lineHeight:'1.5'}}>{r.Description}</p>}
                      <span style={{fontSize:'14px',fontWeight:'600',color:'#007299'}}>{r.EstimatedHours}h</span>
                      {r.EstimatedCompletionDate && <span style={{fontSize:'13px',color:'#717271',marginLeft:'12px'}}>Due: {r.EstimatedCompletionDate}</span>}
                    </div>
                  </div>
                  
                  {editingCompletionDate === r.ID ? (
                    <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
                      <input 
                        type="date"
                        value={completionDateInput}
                        onChange={(e) => this.setState({completionDateInput: e.target.value})}
                        style={{padding:'8px',border:'2px solid #e5e7eb',borderRadius:'6px'}}
                        autoFocus
                      />
                      <button onClick={() => this.addCompletionDate(r.ID, completionDateInput)} disabled={!completionDateInput} style={{padding:'8px 16px',background:!completionDateInput?'#d1d5db':'#007299',color:'white',border:'none',borderRadius:'6px',cursor:!completionDateInput?'not-allowed':'pointer',fontSize:'13px'}}>
                        Save
                      </button>
                      <button onClick={() => this.setState({editingCompletionDate:null,completionDateInput:''})} style={{padding:'8px 16px',background:'#e5e7eb',color:'#717271',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>
                        Cancel
                      </button>
                    </div>
                  ) : !r.EstimatedCompletionDate && (
                    <button onClick={() => this.setState({editingCompletionDate: r.ID})} style={{padding:'8px 16px',background:'#f3f4f6',color:'#717271',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',marginBottom:'12px'}}>
                      Set Completion Date
                    </button>
                  )}
                  
                  <button onClick={() => this.markAsDone(r.ID)} style={{padding:'8px 16px',background:'#10b981',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>
                    Mark as Done
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FINISHED REQUESTS */}
        <div style={{background:'white',borderRadius:'12px',padding:'24px',marginBottom:'24px',boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
          <h2 style={{fontSize:'22px',fontWeight:'600',color:'#003e51',marginBottom:'16px'}}>✔️ Finished Requests ({finishedRequests.length})</h2>
          {finishedRequests.length === 0 ? (
            <p style={{textAlign:'center',padding:'40px',color:'#717271'}}>No finished requests</p>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {finishedRequests.map(r => (
                <div key={r.ID} style={{padding:'16px',border:'2px solid #e5e7eb',borderLeft:'4px solid #10b981',borderRadius:'8px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
                    <div style={{flex:1}}>
                      <h3 style={{fontSize:'16px',fontWeight:'600',color:'#003e51',marginBottom:'6px'}}>{r.Title}</h3>
                      {r.Description && <p style={{fontSize:'14px',color:'#717271',marginBottom:'8px',lineHeight:'1.5'}}>{r.Description}</p>}
                      <div style={{fontSize:'13px',color:'#717271'}}>
                        <span>{r.EstimatedHours}h</span>
                        {r.CompletedDate && <span style={{marginLeft:'12px'}}>Completed: {r.CompletedDate}</span>}
                      </div>
                    </div>
                    <button onClick={() => this.archiveRequest(r.ID)} style={{padding:'8px 16px',background:'#717271',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',marginLeft:'16px'}}>
                      Accept & Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ARCHIVED REQUESTS */}
        <div style={{background:'white',borderRadius:'12px',padding:'24px',boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
            <h2 style={{fontSize:'22px',fontWeight:'600',color:'#003e51'}}>📦 Archived Requests ({archivedRequests.length})</h2>
            <button onClick={() => this.setState({showArchived: !showArchived})} style={{padding:'8px 16px',background:'#e5e7eb',color:'#717271',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'14px'}}>
              {showArchived ? 'Hide' : 'Show'} Archived
            </button>
          </div>
          {showArchived && (
            archivedRequests.length === 0 ? (
              <p style={{textAlign:'center',padding:'40px',color:'#717271'}}>No archived requests</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                {archivedRequests.map(r => (
                  <div key={r.ID} style={{padding:'16px',border:'2px solid #e5e7eb',borderRadius:'8px',opacity:0.7}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
                      <div style={{flex:1}}>
                        <h3 style={{fontSize:'16px',fontWeight:'600',color:'#003e51',marginBottom:'6px'}}>{r.Title}</h3>
                        {r.Description && <p style={{fontSize:'14px',color:'#717271',marginBottom:'8px'}}>{r.Description}</p>}
                        <span style={{fontSize:'13px',color:'#717271'}}>{r.EstimatedHours}h • Completed: {r.CompletedDate}</span>
                      </div>
                      <button onClick={() => this.setState({deleteConfirmId:r.ID})} style={{padding:'8px 16px',background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>
                        Delete
                      </button>
                    </div>
                    {deleteConfirmId === r.ID && (
                      <div style={{marginTop:'12px',padding:'12px',background:'#fff3e0',borderLeft:'3px solid #ff8300',borderRadius:'4px'}}>
                        <p style={{fontSize:'14px',color:'#003e51',marginBottom:'8px'}}>Permanently delete?</p>
                        <div style={{display:'flex',gap:'8px'}}>
                          <button onClick={() => this.del(r.ID)} style={{padding:'6px 12px',background:'#ff8300',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'13px'}}>Yes</button>
                          <button onClick={() => this.setState({deleteConfirmId:null})} style={{padding:'6px 12px',background:'#e5e7eb',color:'#717271',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'13px'}}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div style={{marginTop:'24px',padding:'20px',background:'#d1fae5',borderRadius:'8px',borderLeft:'4px solid #10b981'}}>
          <p style={{color:'#065f46',fontSize:'14px',fontWeight:'600',marginBottom:'8px'}}>✅ Workflow Stages Added!</p>
          <p style={{color:'#059669',fontSize:'14px',lineHeight:'1.6'}}>
            • Pending → Estimated → Approved → Finished → Archived<br/>
            • Add estimates and prioritize requests<br/>
            • Track completion dates<br/>
            • Next: Comments & Attachments
          </p>
        </div>

      </div>
    </div>;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);
