// Settings & User Management
function SettingsView({ tab, setTab }){
  const tabs = [
    { id:"roles", label:"Roles & Permissions" },
    { id:"users", label:"Users" },
    { id:"audit", label:"Audit Log" },
    { id:"integrations", label:"Integrations" },
  ];
  return (
    <>
      <Breadcrumb items={[{label:"Home"},{label:"Administration"},{label: tabs.find(t=>t.id===tab).label}]}/>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <div className="page-sub">
            {tab==="roles" && "Define what each role can see and do across Comprint"}
            {tab==="users" && "Manage workspace members and role assignments"}
            {tab==="audit" && "All security-relevant events, retained for 7 years"}
            {tab==="integrations" && "Connect Comprint to your existing stack"}
          </div>
        </div>
        <div className="row">
          {tab==="roles" && <><button className="btn"><Icon name="download" size={13}/> Export CSV</button><button className="btn btn-primary"><Icon name="plus" size={13}/> New role</button></>}
          {tab==="users" && <button className="btn btn-primary"><Icon name="plus" size={13}/> Invite user</button>}
          {tab==="audit" && <button className="btn"><Icon name="download" size={13}/> Export log</button>}
          {tab==="integrations" && <button className="btn btn-primary"><Icon name="plus" size={13}/> Browse marketplace</button>}
        </div>
      </div>
      <div className="tabs">
        {tabs.map(t=>(<div key={t.id} className={"tab "+(tab===t.id?"active":"")} onClick={()=>setTab(t.id)}>{t.label}</div>))}
      </div>
      {tab==="roles" && <RolesMatrix/>}
      {tab==="users" && <UsersTable/>}
      {tab==="audit" && <AuditLog/>}
      {tab==="integrations" && <Integrations/>}
    </>
  );
}

function RolesMatrix(){
  const ROLES = window.MOCK.ROLES;
  const PM = window.MOCK.PERM_MODULES;
  const [matrix, setMatrix] = useState(()=>{
    const m = {};
    PM.forEach(mod => {
      m[mod.name] = {};
      ROLES.forEach(r=>{
        const found = mod.perms.find(p => p.startsWith(r));
        if (!found) m[mod.name][r] = "none";
        else if (found.endsWith(":partial")) m[mod.name][r] = "partial";
        else m[mod.name][r] = "full";
      });
    });
    return m;
  });
  const cycle = (mod, role) => {
    const next = { ...matrix };
    const cur = next[mod][role];
    next[mod][role] = cur==="none" ? "full" : cur==="full" ? "partial" : "none";
    setMatrix(next);
  };
  return (
    <>
      <div className="card" style={{marginBottom:14,padding:"12px 16px",background:"var(--info-bg)",border:"1px solid #D1E4FF"}}>
        <div className="row" style={{gap:10}}>
          <Icon name="info" size={16} style={{color:"var(--info)",flexShrink:0,marginTop:2}}/>
          <div style={{fontSize:13,color:"var(--text-2)"}}>
            Click a cell to cycle: <span className="perm-cell on" style={{display:"inline-flex",width:16,height:16,verticalAlign:"middle",margin:"0 4px"}}><Icon name="check" size={10}/></span> Full &nbsp;·&nbsp;
            <span className="perm-cell partial" style={{display:"inline-flex",width:16,height:16,verticalAlign:"middle",margin:"0 4px"}}>~</span> Read-only / partial &nbsp;·&nbsp;
            <span className="perm-cell" style={{display:"inline-flex",width:16,height:16,verticalAlign:"middle",margin:"0 4px"}}></span> No access
          </div>
        </div>
      </div>

      <div className="card" style={{overflow:"hidden",overflowX:"auto"}}>
        <table className="matrix">
          <thead>
            <tr>
              <th style={{minWidth:220}}>Module</th>
              {ROLES.map(r=>(<th key={r}>{r}</th>))}
            </tr>
          </thead>
          <tbody>
            {PM.map(mod=>(
              <tr key={mod.name}>
                <td>{mod.name}</td>
                {ROLES.map(r=>{
                  const v = matrix[mod.name][r];
                  return (
                    <td key={r}>
                      <span className={"perm-cell "+(v==="full"?"on":v==="partial"?"partial":"")} onClick={()=>cycle(mod.name, r)}>
                        {v==="full" && <Icon name="check" size={12}/>}
                        {v==="partial" && <span style={{fontSize:12,fontWeight:700}}>~</span>}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function UsersTable(){
  const users = [
    { n:"Anjali Kapoor", e:"anjali.kapoor@acme.in", r:"Administrator", t:"Executive", last:"Just now", status:"Active" },
    { n:"Rohan Mehta", e:"rohan.mehta@acme.in", r:"Sales Manager", t:"Sales", last:"12m ago", status:"Active" },
    { n:"Priya Ranganathan", e:"priya.r@acme.in", r:"Sales Manager", t:"Sales", last:"2h ago", status:"Active" },
    { n:"Suresh Menon", e:"suresh.menon@acme.in", r:"Finance Lead", t:"Finance", last:"1h ago", status:"Active" },
    { n:"Kiran Joshi", e:"kiran.joshi@acme.in", r:"Analyst", t:"Finance", last:"Yesterday", status:"Active" },
    { n:"Vikram Rao", e:"vikram.rao@acme.in", r:"Warehouse Ops", t:"Supply Chain", last:"3d ago", status:"Invited" },
    { n:"Meera Das", e:"meera.das@ext.acme.in", r:"Auditor (Read-only)", t:"External", last:"1w ago", status:"Suspended" },
  ];
  return (
    <div className="table-wrap">
      <div className="table-toolbar">
        <div className="search-field"><Icon name="search" size={14}/><input placeholder="Search users by name or email…"/></div>
        <select className="select" style={{width:"auto"}}><option>All teams</option><option>Sales</option><option>Finance</option><option>Supply Chain</option></select>
        <select className="select" style={{width:"auto"}}><option>All roles</option>{window.MOCK.ROLES.map(r=><option key={r}>{r}</option>)}</select>
      </div>
      <table className="tbl">
        <thead><tr>
          <th className="chk"><span className="cb"/></th>
          <th>Name</th><th>Role</th><th>Team</th><th>Last active</th><th>Status</th><th style={{width:40}}></th>
        </tr></thead>
        <tbody>
          {users.map((u,i)=>(
            <tr key={i}>
              <td><span className="cb"/></td>
              <td>
                <div className="row" style={{gap:10}}>
                  <div className="avatar" style={{width:30,height:30,background:"var(--primary-soft)",color:"var(--primary)"}}>{u.n.split(" ").map(x=>x[0]).join("").slice(0,2)}</div>
                  <div>
                    <div style={{fontWeight:550}}>{u.n}</div>
                    <div className="muted tiny">{u.e}</div>
                  </div>
                </div>
              </td>
              <td className="muted">{u.r}</td>
              <td className="muted">{u.t}</td>
              <td className="muted">{u.last}</td>
              <td><span className={"badge "+(u.status==="Active"?"ok":u.status==="Invited"?"info":"err")}><span className="bdot"/>{u.status}</span></td>
              <td><button className="icon-btn" style={{width:26,height:26}}><Icon name="dots" size={14}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditLog(){
  return (
    <div className="table-wrap">
      <div className="table-toolbar">
        <div className="search-field"><Icon name="search" size={14}/><input placeholder="Search actor, action, target…"/></div>
        <button className="btn btn-sm"><Icon name="calendar" size={12}/> Last 7 days</button>
        <select className="select" style={{width:"auto"}}><option>All actions</option><option>Approvals</option><option>Exports</option><option>Permission changes</option></select>
      </div>
      <table className="tbl">
        <thead><tr><th>Who</th><th>Action</th><th>Target</th><th>When</th><th>IP</th></tr></thead>
        <tbody>
          {window.MOCK.AUDIT_LOG.map((a,i)=>(
            <tr key={i}>
              <td style={{fontWeight:550}}>{a.who}</td>
              <td>{a.action}</td>
              <td className="muted">{a.target}</td>
              <td className="muted mono tiny">{a.when}</td>
              <td className="muted mono tiny">{a.ip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Integrations(){
  const I = window.MOCK.INTEGRATIONS;
  const cats = [...new Set(I.map(x=>x.cat))];
  return (
    <>
      {cats.map(cat=>(
        <div key={cat} style={{marginBottom:22}}>
          <div className="muted tiny" style={{fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>{cat}</div>
          <div className="grid-3">
            {I.filter(i=>i.cat===cat).map(i=>(
              <div key={i.name} className="card card-pad" style={{padding:16}}>
                <div className="row between" style={{marginBottom:10}}>
                  <div className="row" style={{gap:10}}>
                    <div style={{width:36,height:36,borderRadius:8,background:"var(--primary-soft)",color:"var(--primary)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:650}}>{i.letter}</div>
                    <div>
                      <div style={{fontWeight:600,fontSize:14}}>{i.name}</div>
                      <div className="muted tiny">{i.cat}</div>
                    </div>
                  </div>
                  <span className={"badge "+(i.status==="Connected"?"ok":i.status==="Error"?"err":"neutral")}><span className="bdot"/>{i.status}</span>
                </div>
                <div className="muted tiny" style={{minHeight:32}}>{i.note}</div>
                <div className="row" style={{gap:6,marginTop:10,justifyContent:"flex-end"}}>
                  {i.status==="Connected" && <><button className="btn btn-sm">Configure</button><button className="btn btn-sm btn-danger">Disconnect</button></>}
                  {i.status==="Disconnected" && <button className="btn btn-sm btn-primary">Reconnect</button>}
                  {i.status==="Error" && <><button className="btn btn-sm">Details</button><button className="btn btn-sm btn-primary">Reconnect</button></>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

window.SettingsView = SettingsView;
