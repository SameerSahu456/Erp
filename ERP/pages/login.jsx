// Login + Workspace selection
function LoginView({ onSignIn }){
  const [step, setStep] = useState("signin"); // signin | workspace
  const [email, setEmail] = useState("anjali.kapoor@acme.in");
  const [pw, setPw] = useState("••••••••••");
  const [loading, setLoading] = useState(false);

  const signin = ()=>{
    setLoading(true);
    setTimeout(()=>{ setLoading(false); setStep("workspace"); }, 700);
  };

  return (
    <div className="login-shell">
      <div className="login-left">
        <div className="brand">
          <div className="brand-mark">CP</div>
          <div style={{fontWeight:650,fontSize:16}}>Comprint</div>
        </div>
        <div>
          <h1>The operating system for mid-to-large enterprises.</h1>
          <p className="lead">Comprint unifies finance, inventory, sales, and people on a single ledger — so your teams stop reconciling and start executing.</p>
          <div className="stats">
            <div className="s"><div className="sv">2,400+</div><div className="sl">Enterprises</div></div>
            <div className="s"><div className="sv">38</div><div className="sl">Countries</div></div>
            <div className="s"><div className="sv">99.98%</div><div className="sl">Uptime SLA</div></div>
          </div>
        </div>
        <div className="foot">
          <div>© 2026 Comprint Systems Pvt Ltd</div>
          <div>SOC 2 · ISO 27001 · GDPR · SEBI</div>
        </div>
      </div>

      <div className="login-right">
        {step === "signin" ? (
          <div className="login-card">
            <h2>Sign in to Comprint</h2>
            <div className="sub">Use your work account or single sign-on.</div>

            <button className="sso-btn"><SSOLogo kind="msft"/>Continue with Microsoft</button>
            <button className="sso-btn"><SSOLogo kind="google"/>Continue with Google Workspace</button>
            <button className="sso-btn"><SSOLogo kind="okta"/>Continue with Okta SSO</button>
            <button className="sso-btn"><SSOLogo kind="saml"/>SAML / Custom SSO</button>

            <div className="or">or sign in with email</div>
            <div className="field">
              <label className="field-label">Work email</label>
              <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"/>
            </div>
            <div className="field">
              <label className="field-label">Password</label>
              <input className="input" type="password" value={pw} onChange={e=>setPw(e.target.value)}/>
            </div>
            <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",marginTop:6}} onClick={signin} disabled={loading}>
              {loading ? "Verifying…" : "Continue"}
            </button>
            <div className="row between" style={{marginTop:14}}>
              <a href="#" className="muted tiny" onClick={e=>e.preventDefault()}>Forgot password?</a>
              <a href="#" className="muted tiny" onClick={e=>e.preventDefault()}>Request access</a>
            </div>
          </div>
        ) : (
          <div className="login-card" style={{maxWidth:440}}>
            <h2>Select a workspace</h2>
            <div className="sub">You have access to {window.MOCK.WORKSPACES.length} workspaces.</div>
            {window.MOCK.WORKSPACES.map(ws=>(
              <div key={ws.id} className="ws-item" onClick={()=>onSignIn(ws)}>
                <div className="ws-logo">{ws.letter}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:14}}>{ws.name}</div>
                  <div className="muted tiny">{ws.role} · {ws.members} members</div>
                </div>
                <Icon name="chev-r" size={14} className="r"/>
              </div>
            ))}
            <button className="btn" style={{width:"100%",justifyContent:"center",marginTop:12}}>
              <Icon name="plus" size={13}/> Join another workspace
            </button>
            <a href="#" className="muted tiny" style={{display:"inline-block",marginTop:14}} onClick={e=>{e.preventDefault();setStep("signin")}}>← Back to sign in</a>
          </div>
        )}
      </div>
    </div>
  );
}

function SSOLogo({ kind }){
  const s = { width:18, height:18, flexShrink:0 };
  if (kind === "msft") return (
    <svg style={s} viewBox="0 0 24 24"><rect x="2" y="2" width="9" height="9" fill="#F25022"/><rect x="13" y="2" width="9" height="9" fill="#7FBA00"/><rect x="2" y="13" width="9" height="9" fill="#00A4EF"/><rect x="13" y="13" width="9" height="9" fill="#FFB900"/></svg>
  );
  if (kind === "google") return (
    <svg style={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#4285F4" strokeWidth="3"/><path d="M12 3a9 9 0 0 1 9 9h-9z" fill="#EA4335"/><path d="M21 12a9 9 0 0 1-9 9v-9z" fill="#FBBC04"/><path d="M12 21a9 9 0 0 1-9-9h9z" fill="#34A853"/></svg>
  );
  if (kind === "okta") return (
    <svg style={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#007DC1" strokeWidth="4"/></svg>
  );
  return <svg style={s} viewBox="0 0 24 24" fill="none" stroke="#0F1B2D" strokeWidth="1.8"><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3z"/></svg>;
}

window.LoginView = LoginView;
