// Browser-compatible Dashboard
(function() {
  const { Plus, RefreshCw, CheckCircle } = window.lucide;
  const React = window.React;
  const ReactDOM = window.ReactDOM;

  function RequestDashboard() {
    const [message, setMessage] = React.useState('Dashboard Loading...');
    const [status, setStatus] = React.useState('checking');
    const GOOGLE_SCRIPT_URL = window.GOOGLE_SCRIPT_URL;

    React.useEffect(() => {
      if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_SCRIPT_URL_HERE') {
        setMessage('Configure your Google Script URL in config.js');
        setStatus('warning');
      } else {
        setMessage('Configuration looks good! Setup complete.');
        setStatus('success');
      }
    }, [GOOGLE_SCRIPT_URL]);

    return React.createElement('div', { 
      style: {
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px'
      }
    },
      React.createElement('div', { 
        style: {
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          padding: '48px',
          maxWidth: '800px',
          width: '100%'
        }
      },
        React.createElement('div', { style: { textAlign: 'center', marginBottom: '32px' } },
          React.createElement('h1', { 
            style: { 
              fontSize: '36px',
              fontWeight: 'bold',
              marginBottom: '16px',
              color: '#003e51'
            }
          }, 'Continuous Improvement Hours Dashboard'),
          
          React.createElement('p', { 
            style: { 
              fontSize: '20px',
              marginBottom: '24px',
              color: '#717271'
            }
          }, message)
        ),
        
        React.createElement('div', { 
          style: {
            backgroundColor: status === 'success' ? '#e6f4ea' : '#fff4e6',
            borderLeft: '4px solid ' + (status === 'success' ? '#007299' : '#ff8300'),
            padding: '16px',
            marginBottom: '24px',
            borderRadius: '4px'
          }
        },
          React.createElement('h2', { 
            style: {
              fontWeight: 'bold',
              marginBottom: '8px',
              color: '#003e51',
              fontSize: '20px'
            }
          }, status === 'success' ? '🎉 Deployment Successful!' : '⚠️ Configuration Needed'),
          
          React.createElement('p', { style: { color: '#717271' } }, 
            status === 'success' 
              ? 'Your dashboard is properly deployed on GitHub Pages!'
              : 'You need to complete the Google Sheets setup first.'
          )
        ),

        React.createElement('div', { style: { textAlign: 'left', marginBottom: '24px' } },
          React.createElement('h3', { 
            style: {
              fontWeight: 'bold',
              fontSize: '18px',
              color: '#003e51',
              marginBottom: '16px'
            }
          }, 'Setup Checklist:'),
          
          React.createElement('div', { style: { marginLeft: '20px', color: '#717271', lineHeight: '2' } },
            React.createElement('div', null, '✅ GitHub Pages deployment - Working!'),
            React.createElement('div', null, '✅ Dashboard file loaded - Working!'),
            React.createElement('div', null, 
              status === 'success' ? '✅ Config.js setup - Complete!' : '⏳ Config.js setup - Pending'
            ),
            React.createElement('div', null, '⏳ Google Apps Script - Next step'),
            React.createElement('div', null, '⏳ Full dashboard features - Coming soon')
          )
        ),

        React.createElement('div', { 
          style: {
            backgroundColor: '#f3f4f6',
            padding: '20px',
            borderRadius: '8px',
            marginTop: '24px'
          }
        },
          React.createElement('h3', { 
            style: {
              fontWeight: 'bold',
              color: '#003e51',
              marginBottom: '12px'
            }
          }, '📋 Next Steps:'),
          
          React.createElement('ol', { 
            style: { 
              marginLeft: '20px',
              color: '#717271',
              lineHeight: '1.8'
            }
          },
            React.createElement('li', null, 'Create a Google Sheet'),
            React.createElement('li', null, 'Add the Google Apps Script (Code.gs file)'),
            React.createElement('li', null, 'Deploy the script as a Web App'),
            React.createElement('li', null, 'Copy the Web App URL'),
            React.createElement('li', null, 'Add the URL to config.js'),
            React.createElement('li', null, 'Upload the full dashboard.jsx'),
            React.createElement('li', null, 'Come back here and refresh!')
          )
        ),

        React.createElement('div', { 
          style: {
            marginTop: '32px',
            padding: '16px',
            backgroundColor: '#e6f4ff',
            borderRadius: '8px',
            textAlign: 'center'
          }
        },
          React.createElement('p', { 
            style: { 
              color: '#003e51',
              fontWeight: 'bold',
              marginBottom: '8px'
            }
          }, '📖 Need Help?'),
          React.createElement('p', { 
            style: { 
              color: '#717271',
              fontSize: '14px'
            }
          }, 'Check the SETUP-GUIDE.md file for detailed instructions')
        )
      )
    );
  }

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(RequestDashboard));
})();
