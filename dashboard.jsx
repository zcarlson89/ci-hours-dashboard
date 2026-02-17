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
    attachmentType: null,
    attachmentInput: '',
    imagePreview: null,
    editingCompletionDate: null,
    completionDateInput: '',
    editingPrioritizedEstimate: null,
    prioritizedEstimateInput: '',
    commentingOn: null,
    commentInput: '',
    commentAuthor: 'KPCS',
    newTitle: '',
    newDesc: '',
    newAttachmentType: null,
    newAttachmentData: null
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
    // Refresh every 60 seconds instead of 30 for better performance
    setInterval(() => this.load(), 60000);
  }

  load = async () => {
    try {
      this.setState({ syncing: true });
      const res = await fetch(window.GOOGLE_SCRIPT_URL + '?action=getAll&t=' + Date.now(), { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        // Parse comments properly - they come as JSON strings from Google Sheets
        const requestsWithParsedComments = (data.requests || []).map(req => ({
          ...req,
          Comments: typeof req.Comments === 'string' ? 
            (req.Comments ? JSON.parse(req.Comments) : []) : 
            (req.Comments || [])
        }));
        
        this.setState({ 
          requests: requestsWithParsedComments, 
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
    // Don't show syncing spinner for better perceived performance
    try {
      const fd = new URLSearchParams();
      fd.append('action', action);
      Object.keys(params).forEach(key => {
        fd.append(key, typeof params[key] === 'object' ? JSON.stringify(params[key]) : params[key]);
      });
      const res = await fetch(window.GOOGLE_SCRIPT_URL, { method: 'POST', body: fd });
      const result = await res.json();
      if (result.success) {
        // Only reload in background, don't wait
        this.load();
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  handleFileUpload = (e, type, target) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      if (target === 'estimate') {
        if (type === 'pdf') this.setState({ attachmentInput: reader.result });
        else this.setState({ imagePreview: reader.result });
      } else {
        this.setState({ newAttachmentType: type, newAttachmentData: reader.result });
      }
    };
    reader.readAsDataURL(file);
  }

  add = async () => {
    if (!this.state.newTitle) return;
    
    // Save current values before clearing form
    const title = this.state.newTitle;
    const desc = this.state.newDesc;
    const attachType = this.state.newAttachmentType;
    const attachData = this.state.newAttachmentData;
    
    // OPTIMISTIC UPDATE - show new request immediately
    const tempRequest = {
      ID: Date.now(),
      Title: title,
      Description: desc,
      Status: 'pending',
      SubmitterAttachmentType: attachType,
      SubmitterAttachmentData: attachData,
      Comments: []
    };
    
    this.setState({ 
      requests: [...this.state.requests, tempRequest],
      newTitle: '', 
      newDesc: '', 
      newAttachmentType: null, 
      newAttachmentData: null 
    });
    
    // Save to backend in background
    await this.apiCall('addRequest', {
      data: {
        title: title, 
        description: desc, 
        status: 'pending',
        submitterAttachmentType: attachType,
        submitterAttachmentData: attachData,
        comments: []
      }
    });
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
    const { requests, attachmentType, attachmentInput, imagePreview } = this.state;
    const request = requests.find(r => r.ID == id);
    const estimatedRequests = requests.filter(r => r.Status === 'estimated' || r.Status === 'approved');
    const maxPriority = estimatedRequests.length > 0 ? Math.max(...estimatedRequests.map(r => r.Priority || 0)) : 0;
    
    const success = await this.apiCall('updateRequest', {
      data: { 
        ...request, 
        Status: 'estimated', 
        EstimatedHours: parseFloat(hours), 
        Priority: maxPriority + 1,
        AttachmentType: attachmentType,
        AttachmentData: attachmentType === 'pdf' ? attachmentInput : (attachmentType === 'image' ? imagePreview : null)
      }
    });
    
    if (success) this.setState({ editingEstimate: null, estimateInput: '', attachmentType: null, attachmentInput: '', imagePreview: null });
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

  updatePrioritizedEstimate = async (id, newHours) => {
    const { requests } = this.state;
    const request = requests.find(r => r.ID == id);
    const success = await this.apiCall('updateRequest', {
      data: { ...request, EstimatedHours: parseFloat(newHours) }
    });
    if (success) this.setState({ editingPrioritizedEstimate: null, prioritizedEstimateInput: '' });
  }

  addComment = async (id) => {
    const { requests, commentInput, commentAuthor } = this.state;
    if (!commentInput.trim()) return;
    
    const request = requests.find(r => r.ID == id);
    const existingComments = request?.Comments || [];
    const newComment = {
      id: Date.now(),
      author: commentAuthor,
      text: commentInput,
      timestamp: new Date().toLocaleString()
    };
    
    // OPTIMISTIC UPDATE - show comment immediately
    const updatedRequests = requests.map(r => 
      r.ID == id ? { ...r, Comments: [...existingComments, newComment] } : r
    );
    this.setState({ 
      requests: updatedRequests,
      commentInput: '', 
      commentingOn: null 
    });
    
    // Save to backend in background
    await this.apiCall('updateRequest', {
      data: { ...request, Comments: [...existingComments, newComment] }
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

  renderComments = (request) => {
    const { commentingOn, commentInput, commentAuthor } = this.state;
    const comments = request.Comments || [];
    
    return (
      <div style={{marginTop:'12px'}}>
        {comments.length > 0 && (
          <div style={{marginBottom:'12px'}}>
            {comments.map(comment => (
              <div key={comment.id} style={{padding:'10px',background:'#f3f4f6',borderRadius:'6px',marginBottom:'8px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontSize:'12px',fontWeight:'600',color:'#007299'}}>{comment.author}</span>
                  <span style={{fontSize:'11px',color:'#717271'}}>{comment.timestamp}</span>
                </div>
                <p style={{fontSize:'13px',color:'#003e51',margin:0}}>{comment.text}</p>
              </div>
            ))}
          </div>
        )}
        
        {commentingOn === request.ID ? (
          <div style={{border:'2px solid #e5e7eb',borderRadius:'8px',padding:'12px',background:'#f9fafb'}}>
            <div style={{marginBottom:'8px'}}>
              <label style={{fontSize:'13px',fontWeight:'600',color:'#003e51',marginRight:'8px'}}>Posting as:</label>
              <select value={commentAuthor} onChange={(e) => this.setState({commentAuthor: e.target.value})} style={{padding:'4px 8px',border:'1px solid #e5e7eb',borderRadius:'4px',fontSize:'13px'}}>
                <option value="KPCS">KPCS</option>
                <option value="Engineering Services">Engineering Services</option>
              </select>
            </div>
            <textarea 
              placeholder="Add a comment or question..."
              value={commentInput}
              onChange={(e) => this.setState({commentInput: e.target.value})}
              rows={2}
              style={{width:'100%',padding:'8px',border:'1px solid #e5e7eb',borderRadius:'4px',fontSize:'13px',marginBottom:'8px',boxSizing:'border-box',fontFamily:'inherit'}}
              autoFocus
            />
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={() => this.addComment(request.ID)} disabled={!commentInput.trim()} style={{padding:'6px 12px',background:!commentInput.trim()?'#d1d5db':'#007299',color:'white',border:'none',borderRadius:'4px',cursor:!commentInput.trim()?'not-allowed':'pointer',fontSize:'12px'}}>
                Post Comment
              </button>
              <button onClick={() => this.setState({commentingOn: null, commentInput: ''})} style={{padding:'6px 12px',background:'#e5e7eb',color:'#717271',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'12px'}}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => this.setState({commentingOn: request.ID})} style={{padding:'6px 12px',background:'#f3f4f6',color:'#717271',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'12px'}}>
            💬 Add Comment {comments.length > 0 && `(${comments.length})`}
          </button>
        )}
      </div>
    );
  }

  renderAttachments = (request) => {
    return (
      <div style={{display:'flex',gap:'8px',marginTop:'8px',flexWrap:'wrap'}}>
        {request.SubmitterAttachmentType === 'pdf' && request.SubmitterAttachmentData && (
          <a href={request.SubmitterAttachmentData} download="submitter-document.pdf" target="_blank" rel="noopener noreferrer" style={{padding:'4px 10px',background:'#e6f4ea',color:'#007299',borderRadius:'4px',fontSize:'11px',textDecoration:'none',display:'inline-block'}}>
            📄 Submitter PDF
          </a>
        )}
        {request.SubmitterAttachmentType === 'image' && request.SubmitterAttachmentData && (
          <a href={request.SubmitterAttachmentData} download="submitter-image.png" target="_blank" rel="noopener noreferrer" style={{padding:'4px 10px',background:'#e6f4ea',color:'#007299',borderRadius:'4px',fontSize:'11px',textDecoration:'none',display:'inline-block'}}>
            🖼️ Submitter Image
          </a>
        )}
        {request.AttachmentType === 'pdf' && request.AttachmentData && (
          <a href={request.AttachmentData} download="estimate-document.pdf" target="_blank" rel="noopener noreferrer" style={{padding:'4px 10px',background:'#dbeafe',color:'#007299',borderRadius:'4px',fontSize:'11px',textDecoration:'none',display:'inline-block'}}>
            📄 Estimate PDF
          </a>
        )}
        {request.AttachmentType === 'image' && request.AttachmentData && (
          <a href={request.AttachmentData} download="estimate-image.png" target="_blank" rel="noopener noreferrer" style={{padding:'4px 10px',background:'#dbeafe',color:'#007299',borderRadius:'4px',fontSize:'11px',textDecoration:'none',display:'inline-block'}}>
            🖼️ Estimate Image
          </a>
        )}
      </div>
    );
  }

  render() {
    const { requests, loading, syncing, showHistory, showArchived, monthlyHistory, currentMonth, deleteConfirmId, editingEstimate, estimateInput, attachmentType, imagePreview, editingCompletionDate, completionDateInput, editingPrioritizedEstimate, prioritizedEstimateInput, newAttachmentType, newAttachmentData } = this.state;

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
            <p style={{color:'#717271'}}>Complete collaborative workflow with comments & attachments</p>
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

        {/* Add New Request with FILE ATTACHMENTS */}
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
            style={{width:'100%',padding:'12px',marginBottom:'12px',border:'2px solid #e5e7eb',borderRadius:'8px',boxSizing:'border-box',fontFamily:'inherit',resize:'vertical'}}
          />
          
          {/* File Attachment Section */}
          <div style={{border:'2px solid #e5e7eb',borderRadius:'8px',padding:'16px',marginBottom:'16px'}}>
            <div style={{fontSize:'14px',fontWeight:'600',color:'#003e51',marginBottom:'12px'}}>Attach files (optional)</div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              <label style={{padding:'8px 16px',background:newAttachmentType==='pdf'?'#007299':'#f3f4f6',color:newAttachmentType==='pdf'?'white':'#717271',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>
                📄 PDF File
                <input type="file" accept="application/pdf" onChange={(e) => this.handleFileUpload(e, 'pdf', 'new')} style={{display:'none'}} />
              </label>
              <label style={{padding:'8px 16px',background:newAttachmentType==='image'?'#007299':'#f3f4f6',color:newAttachmentType==='image'?'white':'#717271',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>
                🖼️ PNG Image
                <input type="file" accept="image/png" onChange={(e) => this.handleFileUpload(e, 'image', 'new')} style={{display:'none'}} />
              </label>
              {newAttachmentType && (
                <button onClick={() => this.setState({newAttachmentType: null, newAttachmentData: null})} style={{padding:'8px 16px',background:'#ff8300',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>
                  Remove
                </button>
              )}
            </div>
            {newAttachmentType === 'pdf' && newAttachmentData && <div style={{marginTop:'8px',fontSize:'13px',color:'#007299'}}>✓ PDF attached</div>}
            {newAttachmentType === 'image' && newAttachmentData && <img src={newAttachmentData} style={{marginTop:'8px',maxWidth:'200px',height:'auto',borderRadius:'8px'}} alt="Preview" />}
          </div>
          
          <button onClick={this.add} disabled={!this.state.newTitle||syncing} style={{padding:'12px 24px',background:!this.state.newTitle||syncing?'#d1d5db':'#007299',color:'white',border:'none',borderRadius:'8px',cursor:!this.state.newTitle||syncing?'not-allowed':'pointer'}}>
            Submit Request
          </button>
        </div>

        {/* PENDING REQUESTS with COMMENTS */}
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
                        <button onClick={() => this.del(r.ID)} style={{padding:'6px 12px',background:'#ff8300',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'13px'}}>Yes, Delete</button>
                        <button onClick={() => this.setState({deleteConfirmId:null})} style={{padding:'6px 12px',background:'#e5e7eb',color:'#717271',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'13px'}}>Cancel</button>
                      </div>
                    </div>
                  )}
                  
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
                    <div style={{flex:1}}>
                      <h3 style={{fontSize:'16px',fontWeight:'600',color:'#003e51',marginBottom:'6px'}}>{r.Title}</h3>
                      {r.Description && <p style={{fontSize:'14px',color:'#717271',marginBottom:'8px',lineHeight:'1.5'}}>{r.Description}</p>}
                      {this.renderAttachments(r)}
                    </div>
                    <button onClick={() => this.setState({deleteConfirmId:r.ID})} style={{padding:'8px 16px',background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',marginLeft:'16px'}}>Delete</button>
                  </div>
                  
                  {/* COMMENTS */}
                  {this.renderComments(r)}
                  
                  {/* ESTIMATE INPUT */}
                  {editingEstimate === r.ID ? (
                    <div style={{marginTop:'12px',border:'2px solid #e5e7eb',borderRadius:'8px',padding:'12px',background:'#f9fafb'}}>
                      <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
                        <input 
                          type="number" 
                          step="0.5"
                          placeholder="Hours"
                          value={estimateInput}
                          onChange={(e) => this.setState({estimateInput: e.target.value})}
                          style={{width:'100px',padding:'8px',border:'2px solid #e5e7eb',borderRadius:'6px'}}
                          autoFocus
                        />
                        <button onClick={() => this.addEstimate(r.ID, estimateInput)} disabled={!estimateInput} style={{padding:'8px 16px',background:!estimateInput?'#d1d5db':'#007299',color:'white',border:'none',borderRadius:'6px',cursor:!estimateInput?'not-allowed':'pointer',fontSize:'13px'}}>Save</button>
                        <button onClick={() => this.setState({editingEstimate:null,estimateInput:'',attachmentType:null,attachmentInput:'',imagePreview:null})} style={{padding:'8px 16px',background:'#e5e7eb',color:'#717271',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>Cancel</button>
                      </div>
                      
                      {/* Attachment options for estimate */}
                      <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                        <label style={{padding:'6px 12px',background:attachmentType==='pdf'?'#007299':'#f3f4f6',color:attachmentType==='pdf'?'white':'#717271',borderRadius:'4px',cursor:'pointer',fontSize:'12px'}}>
                          📄 PDF
                          <input type="file" accept="application/pdf" onChange={(e) => this.handleFileUpload(e, 'pdf', 'estimate')} style={{display:'none'}} />
                        </label>
                        <label style={{padding:'6px 12px',background:attachmentType==='image'?'#007299':'#f3f4f6',color:attachmentType==='image'?'white':'#717271',borderRadius:'4px',cursor:'pointer',fontSize:'12px'}}>
                          🖼️ PNG
                          <input type="file" accept="image/png" onChange={(e) => this.handleFileUpload(e, 'image', 'estimate')} style={{display:'none'}} />
                        </label>
                        {attachmentType && (
                          <button onClick={() => this.setState({attachmentType:null,attachmentInput:'',imagePreview:null})} style={{padding:'6px 12px',background:'#ff8300',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'12px'}}>Remove</button>
                        )}
                      </div>
                      {attachmentType === 'pdf' && attachmentInput && <div style={{marginTop:'8px',fontSize:'12px',color:'#007299'}}>✓ PDF attached</div>}
                      {attachmentType === 'image' && imagePreview && <img src={imagePreview} style={{marginTop:'8px',maxWidth:'150px',height:'auto',borderRadius:'6px'}} alt="Preview" />}
                    </div>
                  ) : (
                    <button onClick={() => this.setState({editingEstimate: r.ID})} style={{marginTop:'12px',padding:'8px 16px',background:'#717271',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>Add Estimate</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PRIORITIZED REQUESTS with COMMENTS & EDIT ESTIMATE */}
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
                      <button onClick={() => this.movePriority(r.ID, 'up')} disabled={index === 0} style={{padding:'4px',background:index===0?'#f3f4f6':'#e5e7eb',border:'none',borderRadius:'4px',cursor:index===0?'not-allowed':'pointer',fontSize:'16px'}}>▲</button>
                      <button onClick={() => this.movePriority(r.ID, 'down')} disabled={index === estimatedRequests.length - 1} style={{padding:'4px',background:index===estimatedRequests.length-1?'#f3f4f6':'#e5e7eb',border:'none',borderRadius:'4px',cursor:index===estimatedRequests.length-1?'not-allowed':'pointer',fontSize:'16px'}}>▼</button>
                    </div>
                    
                    <div style={{flex:1}}>
                      <h3 style={{fontSize:'16px',fontWeight:'600',color:'#003e51',marginBottom:'6px'}}>{r.Title}</h3>
                      {r.Description && <p style={{fontSize:'14px',color:'#717271',marginBottom:'8px',lineHeight:'1.5'}}>{r.Description}</p>}
                      {this.renderAttachments(r)}
                      
                      {/* COMMENTS */}
                      {this.renderComments(r)}
                      
                      {/* EDIT ESTIMATE */}
                      <div style={{marginTop:'12px',display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                        {editingPrioritizedEstimate === r.ID ? (
                          <>
                            <input 
                              type="number" 
                              step="0.5"
                              placeholder="New hours"
                              value={prioritizedEstimateInput}
                              onChange={(e) => this.setState({prioritizedEstimateInput: e.target.value})}
                              style={{width:'100px',padding:'6px',border:'2px solid #e5e7eb',borderRadius:'4px',fontSize:'13px'}}
                              autoFocus
                            />
                            <button onClick={() => this.updatePrioritizedEstimate(r.ID, prioritizedEstimateInput)} disabled={!prioritizedEstimateInput} style={{padding:'6px 12px',background:!prioritizedEstimateInput?'#d1d5db':'#007299',color:'white',border:'none',borderRadius:'4px',cursor:!prioritizedEstimateInput?'not-allowed':'pointer',fontSize:'12px'}}>Update</button>
                            <button onClick={() => this.setState({editingPrioritizedEstimate:null,prioritizedEstimateInput:''})} style={{padding:'6px 12px',background:'#e5e7eb',color:'#717271',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'12px'}}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <span style={{fontSize:'14px',fontWeight:'600',color:'#003e51'}}>{r.EstimatedHours}h estimated</span>
                            <button onClick={() => this.setState({editingPrioritizedEstimate: r.ID, prioritizedEstimateInput: r.EstimatedHours})} style={{padding:'4px 10px',background:'#f3f4f6',color:'#717271',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'11px'}}>Edit Estimate</button>
                            <button 
                              onClick={() => this.approveRequest(r.ID)} 
                              disabled={remainingHours < r.EstimatedHours}
                              style={{padding:'8px 16px',background:remainingHours<r.EstimatedHours?'#d1d5db':'#007299',color:'white',border:'none',borderRadius:'6px',cursor:remainingHours<r.EstimatedHours?'not-allowed':'pointer',fontSize:'13px',marginLeft:'auto'}}
                            >
                              {remainingHours < r.EstimatedHours ? 'Insufficient Budget' : 'Approve'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <button onClick={() => this.setState({deleteConfirmId:r.ID})} style={{padding:'8px',background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>🗑️</button>
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
                  <div style={{marginBottom:'12px'}}>
                    <h3 style={{fontSize:'16px',fontWeight:'600',color:'#003e51',marginBottom:'6px'}}>{r.Title}</h3>
                    {r.Description && <p style={{fontSize:'14px',color:'#717271',marginBottom:'8px',lineHeight:'1.5'}}>{r.Description}</p>}
                    {this.renderAttachments(r)}
                    <div style={{marginTop:'8px'}}>
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
                      <button onClick={() => this.addCompletionDate(r.ID, completionDateInput)} disabled={!completionDateInput} style={{padding:'8px 16px',background:!completionDateInput?'#d1d5db':'#007299',color:'white',border:'none',borderRadius:'6px',cursor:!completionDateInput?'not-allowed':'pointer',fontSize:'13px'}}>Save</button>
                      <button onClick={() => this.setState({editingCompletionDate:null,completionDateInput:''})} style={{padding:'8px 16px',background:'#e5e7eb',color:'#717271',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>Cancel</button>
                    </div>
                  ) : !r.EstimatedCompletionDate && (
                    <button onClick={() => this.setState({editingCompletionDate: r.ID})} style={{padding:'8px 16px',background:'#f3f4f6',color:'#717271',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',marginBottom:'12px'}}>Set Completion Date</button>
                  )}
                  
                  <button onClick={() => this.markAsDone(r.ID)} style={{padding:'8px 16px',background:'#10b981',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>Mark as Done</button>
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
                      {this.renderAttachments(r)}
                      <div style={{fontSize:'13px',color:'#717271',marginTop:'8px'}}>
                        <span>{r.EstimatedHours}h</span>
                        {r.CompletedDate && <span style={{marginLeft:'12px'}}>Completed: {r.CompletedDate}</span>}
                      </div>
                    </div>
                    <button onClick={() => this.archiveRequest(r.ID)} style={{padding:'8px 16px',background:'#717271',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',marginLeft:'16px'}}>Accept & Archive</button>
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
                        {this.renderAttachments(r)}
                        <span style={{fontSize:'13px',color:'#717271'}}>{r.EstimatedHours}h • Completed: {r.CompletedDate}</span>
                      </div>
                      <button onClick={() => this.setState({deleteConfirmId:r.ID})} style={{padding:'8px 16px',background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}}>Delete</button>
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

        <div style={{marginTop:'24px',padding:'20px',background:'#dcfce7',borderRadius:'8px',borderLeft:'4px solid #10b981'}}>
          <p style={{color:'#065f46',fontSize:'14px',fontWeight:'600',marginBottom:'8px'}}>🎉 Complete Dashboard!</p>
          <p style={{color:'#059669',fontSize:'14px',lineHeight:'1.6'}}>
            ✅ Budget tracking with monthly history<br/>
            ✅ Complete workflow (Pending → Estimated → Approved → Finished → Archived)<br/>
            ✅ Comments system (KPCS ↔ Engineering Services)<br/>
            ✅ File attachments (PDF & PNG) for submitters and coders<br/>
            ✅ Priority ordering & estimate editing<br/>
            ✅ Real-time collaboration via Google Sheets
          </p>
        </div>

      </div>
    </div>;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);
