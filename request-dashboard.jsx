import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, CheckCircle, Clock, AlertCircle, Link, FileImage, CheckSquare, Archive, Calendar, History, MessageSquare } from 'lucide-react';

export default function RequestDashboard() {
  const MONTHLY_BUDGET = 12;
  
  // Helper function to get current month key
  const getCurrentMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };
  
  // Helper function to get month display name
  const getMonthDisplay = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  const [requests, setRequests] = useState([
    { id: 1, title: 'Sample Request', description: 'Add export to CSV feature', status: 'pending', estimatedHours: null, priority: null },
    { id: 2, title: 'Sample Request 2', description: 'Fix login bug on mobile', status: 'estimated', estimatedHours: 3, priority: 1 },
    { id: 3, title: 'Sample Request 3', description: 'Update dashboard UI', status: 'approved', estimatedHours: 5, priority: 2, approvedMonth: getCurrentMonthKey() },
  ]);
  
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthKey());
  const [monthlyHistory, setMonthlyHistory] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  
  // Check if month has changed and archive previous month's data
  React.useEffect(() => {
    const checkMonthChange = () => {
      const newMonth = getCurrentMonthKey();
      if (newMonth !== currentMonth) {
        // Archive the previous month's approved hours
        const previousMonthHours = requests
          .filter(r => r.approvedMonth === currentMonth && (r.status === 'approved' || r.status === 'finished' || r.status === 'archived'))
          .reduce((sum, r) => sum + (r.estimatedHours || 0), 0);
        
        if (previousMonthHours > 0) {
          setMonthlyHistory(prev => ({
            ...prev,
            [currentMonth]: previousMonthHours
          }));
        }
        
        setCurrentMonth(newMonth);
      }
    };
    
    // Check on mount and set up interval to check daily
    checkMonthChange();
    const interval = setInterval(checkMonthChange, 1000 * 60 * 60); // Check every hour
    
    return () => clearInterval(interval);
  }, [currentMonth, requests]);
  
  const [newRequest, setNewRequest] = useState({ 
    title: '', 
    description: '', 
    attachmentType: null, 
    attachmentData: null 
  });
  const [editingEstimate, setEditingEstimate] = useState(null);
  const [estimateInput, setEstimateInput] = useState('');
  const [attachmentType, setAttachmentType] = useState(null); // 'pdf' or 'image'
  const [attachmentInput, setAttachmentInput] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [editingCompletionDate, setEditingCompletionDate] = useState(null);
  const [completionDateInput, setCompletionDateInput] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [commentingOn, setCommentingOn] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentAuthorSelect, setCommentAuthorSelect] = useState('KPCS');
  const [editingPrioritizedEstimate, setEditingPrioritizedEstimate] = useState(null);
  const [prioritizedEstimateInput, setPrioritizedEstimateInput] = useState('');

  const addRequest = () => {
    if (!newRequest.title.trim()) return;
    
    const request = {
      id: Date.now(),
      title: newRequest.title,
      description: newRequest.description,
      status: 'pending',
      estimatedHours: null,
      priority: null,
      submitterAttachmentType: newRequest.attachmentType,
      submitterAttachmentData: newRequest.attachmentData
    };
    
    setRequests([...requests, request]);
    setNewRequest({ title: '', description: '', attachmentType: null, attachmentData: null });
  };

  const deleteRequest = (id) => {
    if (deleteConfirmId === id) {
      setRequests(requests.filter(r => r.id !== id));
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
    }
  };

  const addEstimate = (id, hours) => {
    const updated = requests.map(r => {
      if (r.id === id) {
        const estimatedRequests = requests.filter(req => req.status === 'estimated' || req.status === 'approved');
        const maxPriority = estimatedRequests.length > 0 ? Math.max(...estimatedRequests.map(req => req.priority || 0)) : 0;
        
        return {
          ...r,
          status: 'estimated',
          estimatedHours: parseFloat(hours),
          priority: maxPriority + 1,
          attachmentType: attachmentType,
          attachmentData: attachmentType === 'pdf' ? attachmentInput : (attachmentType === 'image' ? imagePreview : null)
        };
      }
      return r;
    });
    
    setRequests(updated);
    setEditingEstimate(null);
    setEstimateInput('');
    setAttachmentType(null);
    setAttachmentInput('');
    setImagePreview(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'image/png') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentInput(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNewRequestPdfUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRequest({ ...newRequest, attachmentType: 'pdf', attachmentData: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNewRequestImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'image/png') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRequest({ ...newRequest, attachmentType: 'image', attachmentData: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const approveRequest = (id) => {
    setRequests(requests.map(r => 
      r.id === id ? { ...r, status: 'approved', approvedMonth: currentMonth } : r
    ));
  };

  const addCompletionDate = (id, date) => {
    setRequests(requests.map(r => 
      r.id === id ? { ...r, estimatedCompletionDate: date } : r
    ));
    setEditingCompletionDate(null);
    setCompletionDateInput('');
  };

  const markAsDone = (id) => {
    setRequests(requests.map(r => 
      r.id === id ? { ...r, status: 'finished', completedDate: new Date().toLocaleDateString() } : r
    ));
  };

  const archiveRequest = (id) => {
    setRequests(requests.map(r => 
      r.id === id ? { ...r, status: 'archived' } : r
    ));
  };

  const deleteArchivedRequest = (id) => {
    setRequests(requests.filter(r => r.id !== id));
    setDeleteConfirmId(null);
  };

  const addComment = (id) => {
    if (!commentInput.trim()) return;
    
    setRequests(requests.map(r => {
      if (r.id === id) {
        const comments = r.comments || [];
        return {
          ...r,
          comments: [
            ...comments,
            {
              id: Date.now(),
              author: commentAuthorSelect,
              text: commentInput,
              timestamp: new Date().toLocaleString()
            }
          ]
        };
      }
      return r;
    }));
    
    setCommentInput('');
    setCommentingOn(null);
  };

  const updatePrioritizedEstimate = (id, newHours) => {
    setRequests(requests.map(r => 
      r.id === id ? { ...r, estimatedHours: parseFloat(newHours) } : r
    ));
    setEditingPrioritizedEstimate(null);
    setPrioritizedEstimateInput('');
  };

  const movePriority = (id, direction) => {
    const estimatedOnly = requests
      .filter(r => r.status === 'estimated')
      .sort((a, b) => a.priority - b.priority);
    
    const index = estimatedOnly.findIndex(r => r.id === id);
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      const temp = estimatedOnly[index].priority;
      estimatedOnly[index].priority = estimatedOnly[index - 1].priority;
      estimatedOnly[index - 1].priority = temp;
    } else if (direction === 'down' && index < estimatedOnly.length - 1) {
      const temp = estimatedOnly[index].priority;
      estimatedOnly[index].priority = estimatedOnly[index + 1].priority;
      estimatedOnly[index + 1].priority = temp;
    }
    
    setRequests([...requests]);
  };

  const approvedHours = requests
    .filter(r => r.approvedMonth === currentMonth && (r.status === 'approved' || r.status === 'finished' || r.status === 'archived'))
    .reduce((sum, r) => sum + (r.estimatedHours || 0), 0);
  
  const remainingHours = MONTHLY_BUDGET - approvedHours;
  const budgetPercentage = (approvedHours / MONTHLY_BUDGET) * 100;

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const estimatedRequests = requests
    .filter(r => r.status === 'estimated')
    .sort((a, b) => a.priority - b.priority);
  const approvedRequests = requests
    .filter(r => r.status === 'approved')
    .sort((a, b) => a.priority - b.priority);
  const finishedRequests = requests
    .filter(r => r.status === 'finished')
    .sort((a, b) => a.priority - b.priority);
  const archivedRequests = requests
    .filter(r => r.status === 'archived')
    .sort((a, b) => b.id - a.id); // Most recent first

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#003e51' }}>Continuous Improvement Hours Dashboard</h1>
          <p style={{ color: '#717271' }}>Manage code and feature requests with budget tracking</p>
        </header>

        {/* Budget Tracker */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold" style={{ color: '#003e51' }}>Monthly Budget</h2>
              <p className="text-sm" style={{ color: '#717271' }}>{getMonthDisplay(currentMonth)}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors"
                style={{ backgroundColor: '#717271', color: 'white' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#003e51'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#717271'}
              >
                <History size={16} />
                {showHistory ? 'Hide' : 'View'} History
              </button>
              <div className="text-right">
                <div className="text-3xl font-bold" style={{ color: '#003e51' }}>{remainingHours.toFixed(1)}h</div>
                <div className="text-sm" style={{ color: '#717271' }}>remaining of {MONTHLY_BUDGET}h</div>
              </div>
            </div>
          </div>
          
          <div className="w-full bg-slate-200 rounded-full h-6 overflow-hidden">
            <div 
              className="h-full transition-all duration-500"
              style={{ 
                width: `${Math.min(budgetPercentage, 100)}%`,
                backgroundColor: budgetPercentage > 90 ? '#ff8300' : 
                                budgetPercentage > 70 ? '#ff8300' : 
                                '#007299'
              }}
            />
          </div>
          
          <div className="flex justify-between text-sm mt-2" style={{ color: '#717271' }}>
            <span>Approved: {approvedHours.toFixed(1)}h</span>
            <span>{budgetPercentage.toFixed(0)}% used</span>
          </div>
          
          {/* Monthly History */}
          {showHistory && Object.keys(monthlyHistory).length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#003e51' }}>Previous Months</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(monthlyHistory)
                  .sort(([a], [b]) => b.localeCompare(a)) // Sort by most recent first
                  .map(([monthKey, hours]) => (
                    <div 
                      key={monthKey}
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: '#f3f4f6' }}
                    >
                      <div className="text-sm font-semibold" style={{ color: '#003e51' }}>
                        {getMonthDisplay(monthKey)}
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold" style={{ color: '#007299' }}>
                          {hours.toFixed(1)}h
                        </span>
                        <span className="text-sm" style={{ color: '#717271' }}>
                          / {MONTHLY_BUDGET}h
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-slate-300 rounded-full h-2">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${Math.min((hours / MONTHLY_BUDGET) * 100, 100)}%`,
                            backgroundColor: '#007299'
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {showHistory && Object.keys(monthlyHistory).length === 0 && (
            <div className="mt-6 pt-6 border-t border-slate-200 text-center" style={{ color: '#717271' }}>
              No previous month data available
            </div>
          )}
        </div>

        {/* Add New Request */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#003e51' }}>Submit New Request</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Request title"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:border-transparent"
              style={{ focusRingColor: '#007299' }}
              value={newRequest.title}
              onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
              onFocus={(e) => e.target.style.borderColor = '#007299'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            <textarea
              placeholder="Description (optional)"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:border-transparent"
              rows="2"
              value={newRequest.description}
              onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
              onFocus={(e) => e.target.style.borderColor = '#007299'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            
            {/* Attachment section */}
            <div className="border border-slate-300 rounded-lg p-3">
              <div className="text-sm font-semibold mb-2" style={{ color: '#003e51' }}>
                Attach files (optional)
              </div>
              <div className="flex gap-2 mb-2">
                <label className="flex items-center gap-1 px-3 py-1 text-sm rounded cursor-pointer transition-colors"
                  style={{ 
                    backgroundColor: newRequest.attachmentType === 'pdf' ? '#007299' : '#e5e7eb',
                    color: newRequest.attachmentType === 'pdf' ? 'white' : '#717271'
                  }}
                >
                  <Link size={14} />
                  PDF File
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleNewRequestPdfUpload}
                    className="hidden"
                  />
                </label>
                <label className="flex items-center gap-1 px-3 py-1 text-sm rounded cursor-pointer transition-colors"
                  style={{ 
                    backgroundColor: newRequest.attachmentType === 'image' ? '#007299' : '#e5e7eb',
                    color: newRequest.attachmentType === 'image' ? 'white' : '#717271'
                  }}
                >
                  <FileImage size={14} />
                  PNG Image
                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleNewRequestImageUpload}
                    className="hidden"
                  />
                </label>
                {newRequest.attachmentType && (
                  <button
                    onClick={() => setNewRequest({ ...newRequest, attachmentType: null, attachmentData: null })}
                    className="px-3 py-1 text-sm rounded transition-colors"
                    style={{ backgroundColor: '#ff8300', color: 'white' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#cc6900'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#ff8300'}
                  >
                    Remove
                  </button>
                )}
              </div>
              
              {/* Show attachment preview */}
              {newRequest.attachmentType === 'pdf' && newRequest.attachmentData && (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#007299' }}>
                  <Link size={14} />
                  <span>PDF file attached</span>
                </div>
              )}
              {newRequest.attachmentType === 'image' && newRequest.attachmentData && (
                <img 
                  src={newRequest.attachmentData} 
                  alt="Preview" 
                  className="max-w-full h-32 object-contain border rounded"
                  style={{ borderColor: '#717271' }}
                />
              )}
            </div>
            
            <button
              onClick={addRequest}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
              style={{ backgroundColor: '#007299' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#003e51'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#007299'}
            >
              <Plus size={20} />
              Submit Request
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Requests */}
          <div>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2" style={{ color: '#003e51' }}>
              <Clock style={{ color: '#ff8300' }} />
              Pending Estimates ({pendingRequests.length})
            </h2>
            <div className="space-y-3">
              {pendingRequests.map(request => (
                <div key={request.id} className="bg-white rounded-lg shadow p-4 border-l-4" style={{ borderLeftColor: '#ff8300' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold" style={{ color: '#003e51' }}>{request.title}</h3>
                      {request.description && (
                        <p className="text-sm mt-1" style={{ color: '#717271' }}>{request.description}</p>
                      )}
                      
                      {/* Display submitter attachments */}
                      {(request.submitterAttachmentType === 'pdf' || request.submitterAttachmentType === 'image') && request.submitterAttachmentData && (
                        <div className="mt-2 flex items-center gap-2">
                          {request.submitterAttachmentType === 'pdf' && (
                            <a
                              href={request.submitterAttachmentData}
                              download="submitter-document.pdf"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm transition-colors"
                              style={{ color: '#007299' }}
                              onMouseEnter={(e) => e.target.style.color = '#003e51'}
                              onMouseLeave={(e) => e.target.style.color = '#007299'}
                            >
                              <Link size={14} />
                              View PDF
                            </a>
                          )}
                          {request.submitterAttachmentType === 'image' && (
                            <a
                              href={request.submitterAttachmentData}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm transition-colors"
                              style={{ color: '#007299' }}
                              onMouseEnter={(e) => e.target.style.color = '#003e51'}
                              onMouseLeave={(e) => e.target.style.color = '#007299'}
                            >
                              <FileImage size={14} />
                              View Image
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteRequest(request.id)}
                      className="ml-2 transition-colors"
                      style={{ color: '#ff8300' }}
                      onMouseEnter={(e) => e.target.style.color = '#cc6900'}
                      onMouseLeave={(e) => e.target.style.color = '#ff8300'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  {/* Delete Confirmation */}
                  {deleteConfirmId === request.id && (
                    <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#fff3e0', borderLeft: '3px solid #ff8300' }}>
                      <p className="text-sm mb-2" style={{ color: '#003e51' }}>
                        Are you sure you want to delete this request?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => deleteRequest(request.id)}
                          className="flex-1 px-3 py-1 text-white text-sm rounded transition-colors"
                          style={{ backgroundColor: '#ff8300' }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#cc6900'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#ff8300'}
                        >
                          Yes, Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="flex-1 px-3 py-1 text-sm rounded transition-colors"
                          style={{ backgroundColor: '#e5e7eb', color: '#717271' }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#d1d5db'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {editingEstimate === request.id ? (
                    <div className="mt-3 space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.5"
                          placeholder="Hours"
                          className="w-24 px-3 py-1 border rounded"
                          style={{ borderColor: '#717271' }}
                          value={estimateInput}
                          onChange={(e) => setEstimateInput(e.target.value)}
                          onFocus={(e) => e.target.style.borderColor = '#007299'}
                          onBlur={(e) => e.target.style.borderColor = '#717271'}
                          autoFocus
                        />
                        <button
                          onClick={() => addEstimate(request.id, estimateInput)}
                          className="px-3 py-1 text-white text-sm rounded transition-colors"
                          style={{ backgroundColor: '#007299' }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#003e51'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#007299'}
                          disabled={!estimateInput}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingEstimate(null);
                            setEstimateInput('');
                            setAttachmentType(null);
                            setAttachmentInput('');
                            setImagePreview(null);
                          }}
                          className="px-3 py-1 text-sm rounded transition-colors"
                          style={{ backgroundColor: '#e5e7eb', color: '#717271' }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#d1d5db'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                        >
                          Cancel
                        </button>
                      </div>
                      
                      {/* Attachment options */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setAttachmentType('pdf');
                            setImagePreview(null);
                          }}
                          className="flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors"
                          style={{ 
                            backgroundColor: attachmentType === 'pdf' ? '#007299' : '#e5e7eb',
                            color: attachmentType === 'pdf' ? 'white' : '#717271'
                          }}
                        >
                          <Link size={14} />
                          PDF File
                        </button>
                        <button
                          onClick={() => {
                            setAttachmentType('image');
                            setAttachmentInput('');
                          }}
                          className="flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors"
                          style={{ 
                            backgroundColor: attachmentType === 'image' ? '#007299' : '#e5e7eb',
                            color: attachmentType === 'image' ? 'white' : '#717271'
                          }}
                        >
                          <FileImage size={14} />
                          PNG Image
                        </button>
                      </div>
                      
                      {/* PDF File Upload */}
                      {attachmentType === 'pdf' && (
                        <div>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={handlePdfUpload}
                            className="text-sm"
                            style={{ color: '#717271' }}
                          />
                          {attachmentInput && (
                            <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: '#007299' }}>
                              <Link size={14} />
                              <span>PDF uploaded</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Image Upload */}
                      {attachmentType === 'image' && (
                        <div>
                          <input
                            type="file"
                            accept="image/png"
                            onChange={handleImageUpload}
                            className="text-sm"
                            style={{ color: '#717271' }}
                          />
                          {imagePreview && (
                            <img 
                              src={imagePreview} 
                              alt="Preview" 
                              className="mt-2 max-w-full h-32 object-contain border rounded"
                              style={{ borderColor: '#717271' }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {/* Comments Section */}
                      {request.comments && request.comments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {request.comments.map(comment => (
                            <div 
                              key={comment.id}
                              className="p-2 rounded text-sm"
                              style={{ backgroundColor: '#f3f4f6' }}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-xs" style={{ color: '#007299' }}>
                                  {comment.author}
                                </span>
                                <span className="text-xs" style={{ color: '#717271' }}>
                                  {comment.timestamp}
                                </span>
                              </div>
                              <p style={{ color: '#003e51' }}>{comment.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Add Comment */}
                      {commentingOn === request.id ? (
                        <div className="mt-3 space-y-2">
                          <div className="flex gap-2 items-center mb-2">
                            <label className="text-sm font-semibold" style={{ color: '#003e51' }}>
                              Posting as:
                            </label>
                            <select
                              value={commentAuthorSelect}
                              onChange={(e) => setCommentAuthorSelect(e.target.value)}
                              className="px-2 py-1 border rounded text-sm"
                              style={{ borderColor: '#717271', color: '#003e51' }}
                            >
                              <option value="KPCS">KPCS</option>
                              <option value="Engineering Services">Engineering Services</option>
                            </select>
                          </div>
                          <textarea
                            placeholder="Add a comment or question..."
                            className="w-full px-3 py-2 border rounded text-sm"
                            style={{ borderColor: '#717271' }}
                            rows="2"
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            onFocus={(e) => e.target.style.borderColor = '#007299'}
                            onBlur={(e) => e.target.style.borderColor = '#717271'}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => addComment(request.id)}
                              className="px-3 py-1 text-white text-sm rounded transition-colors"
                              style={{ backgroundColor: '#007299' }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#003e51'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#007299'}
                              disabled={!commentInput.trim()}
                            >
                              Post Comment
                            </button>
                            <button
                              onClick={() => {
                                setCommentingOn(null);
                                setCommentInput('');
                              }}
                              className="px-3 py-1 text-sm rounded transition-colors"
                              style={{ backgroundColor: '#e5e7eb', color: '#717271' }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#d1d5db'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCommentingOn(request.id)}
                          className="mt-3 flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors"
                          style={{ backgroundColor: '#f3f4f6', color: '#717271' }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#e5e7eb';
                            e.target.style.color = '#003e51';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#f3f4f6';
                            e.target.style.color = '#717271';
                          }}
                        >
                          <MessageSquare size={14} />
                          Add Comment {request.comments && request.comments.length > 0 && `(${request.comments.length})`}
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          setEditingEstimate(request.id);
                          setEstimateInput('');
                        }}
                        className="mt-2 px-3 py-1 text-white text-sm rounded transition-colors"
                        style={{ backgroundColor: '#717271' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#003e51'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#717271'}
                      >
                        Add Estimate
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {pendingRequests.length === 0 && (
                <div className="text-center py-8" style={{ color: '#717271' }}>
                  No pending requests
                </div>
              )}
            </div>
          </div>

          {/* Prioritized Requests */}
          <div>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2" style={{ color: '#003e51' }}>
              <AlertCircle style={{ color: '#007299' }} />
              Prioritized Requests ({estimatedRequests.length})
            </h2>
            <div className="space-y-3">
              {estimatedRequests.map((request, index) => (
                <div 
                  key={request.id} 
                  className="bg-white rounded-lg shadow p-4 border-l-4"
                  style={{ borderLeftColor: '#717271' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => movePriority(request.id, 'up')}
                        disabled={index === 0}
                        className="transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ color: '#717271' }}
                        onMouseEnter={(e) => !e.target.disabled && (e.target.style.color = '#003e51')}
                        onMouseLeave={(e) => !e.target.disabled && (e.target.style.color = '#717271')}
                      >
                        <ChevronUp size={20} />
                      </button>
                      <button
                        onClick={() => movePriority(request.id, 'down')}
                        disabled={index === estimatedRequests.length - 1}
                        className="transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ color: '#717271' }}
                        onMouseEnter={(e) => !e.target.disabled && (e.target.style.color = '#003e51')}
                        onMouseLeave={(e) => !e.target.disabled && (e.target.style.color = '#717271')}
                      >
                        <ChevronDown size={20} />
                      </button>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm" style={{ color: '#717271' }}>#{request.priority}</span>
                            <h3 className="font-semibold" style={{ color: '#003e51' }}>{request.title}</h3>
                          </div>
                          {request.description && (
                            <p className="text-sm mt-1" style={{ color: '#717271' }}>{request.description}</p>
                          )}
                          
                          {/* Display submitter attachments */}
                          {(request.submitterAttachmentType === 'pdf' || request.submitterAttachmentType === 'image') && request.submitterAttachmentData && (
                            <div className="mt-2 flex items-center gap-2">
                              {request.submitterAttachmentType === 'pdf' && (
                                <a
                                  href={request.submitterAttachmentData}
                                  download="submitter-document.pdf"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded"
                                  style={{ color: '#717271', backgroundColor: '#f3f4f6' }}
                                  onMouseEnter={(e) => {
                                    e.target.style.color = '#003e51';
                                    e.target.style.backgroundColor = '#e5e7eb';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.color = '#717271';
                                    e.target.style.backgroundColor = '#f3f4f6';
                                  }}
                                >
                                  <Link size={12} />
                                  Submitter PDF
                                </a>
                              )}
                              {request.submitterAttachmentType === 'image' && (
                                <a
                                  href={request.submitterAttachmentData}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded"
                                  style={{ color: '#717271', backgroundColor: '#f3f4f6' }}
                                  onMouseEnter={(e) => {
                                    e.target.style.color = '#003e51';
                                    e.target.style.backgroundColor = '#e5e7eb';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.color = '#717271';
                                    e.target.style.backgroundColor = '#f3f4f6';
                                  }}
                                >
                                  <FileImage size={12} />
                                  Submitter Image
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteRequest(request.id)}
                          className="ml-2 transition-colors"
                          style={{ color: '#ff8300' }}
                          onMouseEnter={(e) => e.target.style.color = '#cc6900'}
                          onMouseLeave={(e) => e.target.style.color = '#ff8300'}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      {/* Delete Confirmation */}
                      {deleteConfirmId === request.id && (
                        <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#fff3e0', borderLeft: '3px solid #ff8300' }}>
                          <p className="text-sm mb-2" style={{ color: '#003e51' }}>
                            Are you sure you want to delete this request?
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => deleteRequest(request.id)}
                              className="flex-1 px-3 py-1 text-white text-sm rounded transition-colors"
                              style={{ backgroundColor: '#ff8300' }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#cc6900'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#ff8300'}
                            >
                              Yes, Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="flex-1 px-3 py-1 text-sm rounded transition-colors"
                              style={{ backgroundColor: '#e5e7eb', color: '#717271' }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#d1d5db'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Comments Section */}
                      {request.comments && request.comments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {request.comments.map(comment => (
                            <div 
                              key={comment.id}
                              className="p-2 rounded text-sm"
                              style={{ backgroundColor: '#f3f4f6' }}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-xs" style={{ color: '#007299' }}>
                                  {comment.author}
                                </span>
                                <span className="text-xs" style={{ color: '#717271' }}>
                                  {comment.timestamp}
                                </span>
                              </div>
                              <p style={{ color: '#003e51' }}>{comment.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Add Comment */}
                      {commentingOn === request.id ? (
                        <div className="mt-3 space-y-2">
                          <div className="flex gap-2 items-center mb-2">
                            <label className="text-sm font-semibold" style={{ color: '#003e51' }}>
                              Posting as:
                            </label>
                            <select
                              value={commentAuthorSelect}
                              onChange={(e) => setCommentAuthorSelect(e.target.value)}
                              className="px-2 py-1 border rounded text-sm"
                              style={{ borderColor: '#717271', color: '#003e51' }}
                            >
                              <option value="KPCS">KPCS</option>
                              <option value="Engineering Services">Engineering Services</option>
                            </select>
                          </div>
                          <textarea
                            placeholder="Add a comment or question..."
                            className="w-full px-3 py-2 border rounded text-sm"
                            style={{ borderColor: '#717271' }}
                            rows="2"
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            onFocus={(e) => e.target.style.borderColor = '#007299'}
                            onBlur={(e) => e.target.style.borderColor = '#717271'}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => addComment(request.id)}
                              className="px-3 py-1 text-white text-sm rounded transition-colors"
                              style={{ backgroundColor: '#007299' }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#003e51'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#007299'}
                              disabled={!commentInput.trim()}
                            >
                              Post Comment
                            </button>
                            <button
                              onClick={() => {
                                setCommentingOn(null);
                                setCommentInput('');
                              }}
                              className="px-3 py-1 text-sm rounded transition-colors"
                              style={{ backgroundColor: '#e5e7eb', color: '#717271' }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#d1d5db'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCommentingOn(request.id)}
                          className="mt-3 flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors"
                          style={{ backgroundColor: '#f3f4f6', color: '#717271' }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#e5e7eb';
                            e.target.style.color = '#003e51';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#f3f4f6';
                            e.target.style.color = '#717271';
                          }}
                        >
                          <MessageSquare size={14} />
                          Add Comment {request.comments && request.comments.length > 0 && `(${request.comments.length})`}
                        </button>
                      )}
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          {editingPrioritizedEstimate === request.id ? (
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                step="0.5"
                                placeholder="New hours"
                                className="w-24 px-3 py-1 border rounded text-sm"
                                style={{ borderColor: '#717271' }}
                                value={prioritizedEstimateInput}
                                onChange={(e) => setPrioritizedEstimateInput(e.target.value)}
                                onFocus={(e) => e.target.style.borderColor = '#007299'}
                                onBlur={(e) => e.target.style.borderColor = '#717271'}
                                autoFocus
                              />
                              <button
                                onClick={() => updatePrioritizedEstimate(request.id, prioritizedEstimateInput)}
                                className="px-3 py-1 text-white text-sm rounded transition-colors"
                                style={{ backgroundColor: '#007299' }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#003e51'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#007299'}
                                disabled={!prioritizedEstimateInput}
                              >
                                Update
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPrioritizedEstimate(null);
                                  setPrioritizedEstimateInput('');
                                }}
                                className="px-3 py-1 text-sm rounded transition-colors"
                                style={{ backgroundColor: '#e5e7eb', color: '#717271' }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#d1d5db'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-semibold" style={{ color: '#003e51' }}>
                                {request.estimatedHours}h estimated
                              </span>
                              <button
                                onClick={() => {
                                  setEditingPrioritizedEstimate(request.id);
                                  setPrioritizedEstimateInput(request.estimatedHours.toString());
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
                                style={{ backgroundColor: '#f3f4f6', color: '#717271' }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#e5e7eb';
                                  e.target.style.color = '#003e51';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#f3f4f6';
                                  e.target.style.color = '#717271';
                                }}
                              >
                                Edit Estimate
                              </button>
                            </>
                          )}
                          
                          {/* Display coder's estimate attachments */}
                          {request.attachmentType === 'pdf' && request.attachmentData && (
                            <a
                              href={request.attachmentData}
                              download="estimate-document.pdf"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm transition-colors"
                              style={{ color: '#007299' }}
                              onMouseEnter={(e) => e.target.style.color = '#003e51'}
                              onMouseLeave={(e) => e.target.style.color = '#007299'}
                            >
                              <Link size={14} />
                              Estimate PDF
                            </a>
                          )}
                          
                          {request.attachmentType === 'image' && request.attachmentData && (
                            <a
                              href={request.attachmentData}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm transition-colors"
                              style={{ color: '#007299' }}
                              onMouseEnter={(e) => e.target.style.color = '#003e51'}
                              onMouseLeave={(e) => e.target.style.color = '#007299'}
                            >
                              <FileImage size={14} />
                              Estimate Image
                            </a>
                          )}
                        </div>
                        
                        <button
                          onClick={() => approveRequest(request.id)}
                          className="flex items-center gap-1 px-3 py-1 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: remainingHours < request.estimatedHours ? '#717271' : '#007299' }}
                          onMouseEnter={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#003e51')}
                          onMouseLeave={(e) => !e.target.disabled && (e.target.style.backgroundColor = remainingHours < request.estimatedHours ? '#717271' : '#007299')}
                          disabled={remainingHours < request.estimatedHours}
                        >
                          <CheckCircle size={16} />
                          {remainingHours < request.estimatedHours ? 'Insufficient Budget' : 'Approve'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {estimatedRequests.length === 0 && (
                <div className="text-center py-8" style={{ color: '#717271' }}>
                  No estimated requests yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Approved Requests Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2" style={{ color: '#003e51' }}>
            <CheckCircle style={{ color: '#007299' }} />
            Approved Requests ({approvedRequests.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvedRequests.map((request) => (
              <div 
                key={request.id} 
                className="bg-white rounded-lg shadow p-4 border-l-4"
                style={{ borderLeftColor: '#007299' }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: '#003e51' }}>{request.title}</h3>
                    {request.description && (
                      <p className="text-sm mt-1" style={{ color: '#717271' }}>{request.description}</p>
                    )}
                    <div className="text-sm font-semibold mt-2" style={{ color: '#003e51' }}>
                      {request.estimatedHours}h
                    </div>
                    
                    {request.estimatedCompletionDate && (
                      <div className="flex items-center gap-1 text-sm mt-2" style={{ color: '#007299' }}>
                        <Calendar size={14} />
                        <span>Due: {request.estimatedCompletionDate}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteRequest(request.id)}
                    className="ml-2 transition-colors"
                    style={{ color: '#ff8300' }}
                    onMouseEnter={(e) => e.target.style.color = '#cc6900'}
                    onMouseLeave={(e) => e.target.style.color = '#ff8300'}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                {/* Delete Confirmation */}
                {deleteConfirmId === request.id && (
                  <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#fff3e0', borderLeft: '3px solid #ff8300' }}>
                    <p className="text-sm mb-2" style={{ color: '#003e51' }}>
                      Are you sure you want to delete this request?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteRequest(request.id)}
                        className="flex-1 px-3 py-1 text-white text-sm rounded transition-colors"
                        style={{ backgroundColor: '#ff8300' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#cc6900'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#ff8300'}
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex-1 px-3 py-1 text-sm rounded transition-colors"
                        style={{ backgroundColor: '#e5e7eb', color: '#717271' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#d1d5db'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                {editingCompletionDate === request.id ? (
                  <div className="flex gap-2 mt-3">
                    <input
                      type="date"
                      className="flex-1 px-2 py-1 border rounded text-sm"
                      style={{ borderColor: '#717271' }}
                      value={completionDateInput}
                      onChange={(e) => setCompletionDateInput(e.target.value)}
                      onFocus={(e) => e.target.style.borderColor = '#007299'}
                      onBlur={(e) => e.target.style.borderColor = '#717271'}
                    />
                    <button
                      onClick={() => addCompletionDate(request.id, completionDateInput)}
                      className="px-2 py-1 text-white text-sm rounded transition-colors"
                      style={{ backgroundColor: '#007299' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#003e51'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#007299'}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingCompletionDate(request.id);
                      setCompletionDateInput(request.estimatedCompletionDate || '');
                    }}
                    className="mt-3 w-full px-3 py-1 text-white text-sm rounded transition-colors"
                    style={{ backgroundColor: '#717271' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#003e51'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#717271'}
                  >
                    {request.estimatedCompletionDate ? 'Update Date' : 'Set Completion Date'}
                  </button>
                )}
                
                <button
                  onClick={() => markAsDone(request.id)}
                  className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1 text-white text-sm rounded transition-colors"
                  style={{ backgroundColor: '#007299' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#003e51'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#007299'}
                >
                  <CheckSquare size={14} />
                  Mark as Done
                </button>
              </div>
            ))}
            
            {approvedRequests.length === 0 && (
              <div className="col-span-full text-center py-8" style={{ color: '#717271' }}>
                No approved requests yet
              </div>
            )}
          </div>
        </div>

        {/* Finished Requests Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2" style={{ color: '#003e51' }}>
            <CheckSquare style={{ color: '#007299' }} />
            Finished Requests ({finishedRequests.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {finishedRequests.map((request) => (
              <div 
                key={request.id} 
                className="bg-white rounded-lg shadow p-4 border-l-4"
                style={{ borderLeftColor: '#007299' }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: '#003e51' }}>{request.title}</h3>
                    {request.description && (
                      <p className="text-sm mt-1" style={{ color: '#717271' }}>{request.description}</p>
                    )}
                    <div className="text-sm font-semibold mt-2" style={{ color: '#003e51' }}>
                      {request.estimatedHours}h
                    </div>
                    <div className="text-sm mt-1" style={{ color: '#717271' }}>
                      Completed: {request.completedDate}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => archiveRequest(request.id)}
                  className="mt-3 w-full flex items-center justify-center gap-1 px-3 py-1 text-white text-sm rounded transition-colors"
                  style={{ backgroundColor: '#007299' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#003e51'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#007299'}
                >
                  <Archive size={14} />
                  Accept & Archive
                </button>
              </div>
            ))}
            
            {finishedRequests.length === 0 && (
              <div className="col-span-full text-center py-8" style={{ color: '#717271' }}>
                No finished requests yet
              </div>
            )}
          </div>
        </div>

        {/* Archived Requests Section */}
        {archivedRequests.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2" style={{ color: '#003e51' }}>
                <Archive style={{ color: '#717271' }} />
                Archived Requests ({archivedRequests.length})
              </h2>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="px-3 py-1 text-sm rounded transition-colors"
                style={{ backgroundColor: '#717271', color: 'white' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#003e51'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#717271'}
              >
                {showArchived ? 'Hide' : 'Show'} Archived
              </button>
            </div>
            
            {showArchived && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archivedRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="bg-white rounded-lg shadow p-4 border-l-4 opacity-75"
                    style={{ borderLeftColor: '#717271' }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold" style={{ color: '#003e51' }}>{request.title}</h3>
                        {request.description && (
                          <p className="text-sm mt-1" style={{ color: '#717271' }}>{request.description}</p>
                        )}
                        <div className="text-sm font-semibold mt-2" style={{ color: '#003e51' }}>
                          {request.estimatedHours}h
                        </div>
                        <div className="text-sm mt-1" style={{ color: '#717271' }}>
                          Completed: {request.completedDate}
                        </div>
                      </div>
                      <button
                        onClick={() => setDeleteConfirmId(request.id)}
                        className="ml-2 transition-colors"
                        style={{ color: '#ff8300' }}
                        onMouseEnter={(e) => e.target.style.color = '#cc6900'}
                        onMouseLeave={(e) => e.target.style.color = '#ff8300'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    
                    {/* Delete Confirmation */}
                    {deleteConfirmId === request.id && (
                      <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#fff3e0', borderLeft: '3px solid #ff8300' }}>
                        <p className="text-sm mb-2" style={{ color: '#003e51' }}>
                          Are you sure you want to permanently delete this request?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => deleteArchivedRequest(request.id)}
                            className="flex-1 px-3 py-1 text-white text-sm rounded transition-colors"
                            style={{ backgroundColor: '#ff8300' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#cc6900'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#ff8300'}
                          >
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="flex-1 px-3 py-1 text-sm rounded transition-colors"
                            style={{ backgroundColor: '#e5e7eb', color: '#717271' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#d1d5db'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}