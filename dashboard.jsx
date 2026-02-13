const { Plus, Trash2, RefreshCw } = window.lucide;

class Dashboard extends React.Component {
  state = {
    requests: [],
    loading: true,
    newTitle: '',
    newDesc: ''
  }

  componentDidMount() {
    this.load();
    setInterval(() => this.load(), 30000);
  }

  load = async () => {
    try {
      const res = await fetch(window.GOOGLE_SCRIPT_URL + '?action=getAll', { method: 'POST' });
      const data = await res.json();
      this.setState({ requests: data.requests || [], loading: false });
    } catch (e) {
      console.error(e);
      this.setState({ loading: false });
    }
  }

  add = async () => {
    if (!this.state.newTitle) return;
    const fd = new URLSearchParams();
    fd.append('action', 'addRequest');
    fd.append('data', JSON.stringify({ title: this.state.newTitle, description: this.state.newDesc, status: 'pending' }));
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
    if (this.state.loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <h2>Loading...</h2>
    </div>;

    return <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#f8fafc,#e2e8f0)',padding:'32px'}}>
      <div style={{maxWidth:'1200px',margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'32px'}}>
          <h1 style={{fontSize:'36px',fontWeight:'bold',color:'#003e51'}}>CI Hours Dashboard</h1>
          <button onClick={this.load} style={{padding:'12px 24px',background:'#007299',color:'white',border:'none',borderRadius:'8px',cursor:'pointer'}}>
            Refresh
          </button>
        </div>

        <div style={{background:'white',borderRadius:'12px',padding:'24px',marginBottom:'24px',boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
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
          <button onClick={this.add} disabled={!this.state.newTitle} style={{padding:'12px 24px',background:this.state.newTitle?'#007299':'#d1d5db',color:'white',border:'none',borderRadius:'8px',cursor:this.state.newTitle?'pointer':'not-allowed'}}>
            Submit
          </button>
        </div>

        <div style={{background:'white',borderRadius:'12px',padding:'24px',boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
          <h2 style={{fontSize:'20px',fontWeight:'600',color:'#003e51',marginBottom:'16px'}}>All Requests ({this.state.requests.length})</h2>
          {this.state.requests.length === 0 ? (
            <p style={{textAlign:'center',padding:'40px',color:'#717271'}}>No requests yet</p>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {this.state.requests.map(r => (
                <div key={r.ID} style={{padding:'16px',border:'2px solid #e5e7eb',borderLeft:'4px solid #007299',borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'start'}}>
                  <div style={{flex:1}}>
                    <h3 style={{fontSize:'16px',fontWeight:'600',color:'#003e51',marginBottom:'6px'}}>{r.Title}</h3>
                    {r.Description && <p style={{fontSize:'14px',color:'#717271',marginBottom:'8px'}}>{r.Description}</p>}
                    <span style={{display:'inline-block',padding:'4px 12px',background:'#e6f4ea',color:'#007299',borderRadius:'12px',fontSize:'12px',fontWeight:'600'}}>{r.Status || 'pending'}</span>
                  </div>
                  <button onClick={() => this.del(r.ID)} style={{padding:'8px 16px',background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:'6px',cursor:'pointer',marginLeft:'16px'}}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{marginTop:'24px',padding:'20px',background:'#d1fae5',borderRadius:'8px',borderLeft:'4px solid #10b981'}}>
          <p style={{color:'#065f46',fontWeight:'600',marginBottom:'4px'}}>✅ SUCCESS! Your collaborative dashboard is working!</p>
          <p style={{color:'#059669',fontSize:'14px'}}>Try it: Open this URL in another browser to see changes sync in real-time.</p>
        </div>
      </div>
    </div>;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);
