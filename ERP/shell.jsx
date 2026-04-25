// Shell: Sidebar + Topbar + Breadcrumb
const { useState, useEffect, useMemo, useRef } = React;

const MODULE_GROUPS = [
  { id:"fav", label:"Pinned", items:[
    { id:"home", label:"Global Dashboard", icon:"home" },
    { id:"inventory", label:"Stock Levels", icon:"box" },
    { id:"sales", label:"Sales Pipeline", icon:"chart" },
  ]},
  { id:"ops", label:"Operations", items:[
    { id:"inventory-root", label:"Inventory", icon:"box", route:"inventory" },
    { id:"purchasing", label:"Purchase Orders", icon:"truck", route:"inventory", tab:"po", badge:"3", badgeType:"warn" },
    { id:"suppliers", label:"Suppliers", icon:"building", route:"inventory", tab:"supplier" },
    { id:"warehouses", label:"Warehouses", icon:"layers", route:"inventory" },
  ]},
  { id:"rev", label:"Revenue", items:[
    { id:"sales-root", label:"Sales & CRM", icon:"briefcase", route:"sales" },
    { id:"customers", label:"Customers", icon:"users", route:"sales", tab:"customer" },
    { id:"quotes", label:"Quotes & Orders", icon:"file", route:"sales", tab:"quote" },
    { id:"ar", label:"Invoicing & AR", icon:"cash", route:"sales" },
  ]},
  { id:"insight", label:"Analytics", items:[
    { id:"reports", label:"Reports", icon:"pie", route:"reports" },
    { id:"builder", label:"Report Builder", icon:"grid", route:"reports", tab:"builder" },
    { id:"scheduled", label:"Scheduled", icon:"calendar", route:"reports", tab:"scheduled" },
  ]},
  { id:"admin", label:"Administration", items:[
    { id:"settings-root", label:"Settings", icon:"gear", route:"settings" },
    { id:"users", label:"Users & Roles", icon:"shield", route:"settings", tab:"roles" },
    { id:"integrations", label:"Integrations", icon:"plug", route:"settings", tab:"integrations" },
    { id:"audit", label:"Audit Log", icon:"book", route:"settings", tab:"audit" },
  ]},
];

// Route inference from nav id
const ROUTE_MAP = {
  "home":{page:"dashboard"},
  "inventory":{page:"inventory"}, "inventory-root":{page:"inventory"},
  "purchasing":{page:"inventory", tab:"po"},
  "suppliers":{page:"inventory", tab:"supplier"},
  "warehouses":{page:"inventory"},
  "sales":{page:"sales"}, "sales-root":{page:"sales"},
  "customers":{page:"sales", tab:"customer"},
  "quotes":{page:"sales", tab:"quote"},
  "ar":{page:"sales"},
  "reports":{page:"reports"},
  "builder":{page:"reports", tab:"builder"},
  "scheduled":{page:"reports", tab:"scheduled"},
  "settings-root":{page:"settings"},
  "users":{page:"settings", tab:"roles"},
  "integrations":{page:"settings", tab:"integrations"},
  "audit":{page:"settings", tab:"audit"},
};

function Sidebar({ activeNav, onNav, collapsed, setCollapsed }){
  const [openGroups, setOpenGroups] = useState({ fav:true, ops:true, rev:true, insight:true, admin:true });
  return (
    <aside className={"sidebar "+(collapsed?"collapsed":"")}>
      <div className="sidebar-brand">
        <div className="brand-mark">CP</div>
        <div className="brand-name">Comprint</div>
        <button className="icon-btn" style={{marginLeft:"auto",width:28,height:28}} onClick={()=>setCollapsed(!collapsed)} title={collapsed?"Expand":"Collapse"}>
          <Icon name={collapsed?"chev-r":"chev-l"} size={14}/>
        </button>
      </div>
      <div className="sidebar-scroll">
        {MODULE_GROUPS.map(g=>(
          <div key={g.id} className={"sidebar-section "+(openGroups[g.id]?"":"collapsed")}>
            <div className="sidebar-section-label" onClick={()=>setOpenGroups({...openGroups,[g.id]:!openGroups[g.id]})}>
              <span>{g.id==="fav" && <Icon name="pin" size={11} className="" />} {g.label}</span>
              <span className="chev"><Icon name="chev-d" size={11}/></span>
            </div>
            {g.items.map(it=>(
              <div key={it.id} className={"nav-item "+(activeNav===it.id?"active":"")} onClick={()=>onNav(it.id)}>
                <Icon name={it.icon} className="ico"/>
                <span className="nav-label">{it.label}</span>
                {it.badge && <span className={"nav-badge "+(it.badgeType||"")}>{it.badge}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        <div className="avatar">AK</div>
        <div style={{lineHeight:1.2,flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Anjali Kapoor</div>
          <div style={{fontSize:11.5,color:"var(--text-3)"}}>Administrator</div>
        </div>
        <button className="icon-btn" style={{width:28,height:28}} title="Log out"><Icon name="chev-r" size={13}/></button>
      </div>
    </aside>
  );
}

function Topbar({ onToggleSidebar, onSignOut }){
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef(null), profRef = useRef(null);
  useEffect(()=>{
    const h = (e)=>{
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profRef.current && !profRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", h);
    return ()=>document.removeEventListener("mousedown", h);
  },[]);
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onToggleSidebar} title="Toggle sidebar"><Icon name="menu"/></button>
      <div className="topbar-search">
        <Icon name="search" size={15}/>
        <input placeholder="Search customers, Part nos, orders, reports…"/>
        <kbd>⌘K</kbd>
      </div>
      <div className="topbar-actions">
        <button className="icon-btn" title="Help"><Icon name="help"/></button>
        <div ref={notifRef} style={{position:"relative"}}>
          <button className="icon-btn" title="Notifications" onClick={()=>setNotifOpen(!notifOpen)}>
            <Icon name="bell"/><span className="dot"/>
          </button>
          {notifOpen && (
            <div className="card" style={{position:"absolute",top:40,right:0,width:340,zIndex:40}}>
              <div className="card-header"><div className="card-title">Notifications</div><div className="muted tiny">5 new</div></div>
              <div style={{padding:"4px 14px 10px",maxHeight:360,overflow:"auto"}}>
                {window.MOCK.ALERTS.slice(0,5).map((a,i)=>(
                  <div key={i} className="alert-row">
                    <div className={"alert-ico "+a.type}><Icon name={a.type==="err"?"warn":a.type==="warn"?"warn":"info"} size={14}/></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:550}}>{a.title}</div>
                      <div className="muted tiny" style={{marginTop:2}}>{a.sub}</div>
                    </div>
                    <div className="muted tiny" style={{whiteSpace:"nowrap"}}>{a.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div ref={profRef} style={{position:"relative"}}>
          <button className="icon-btn" onClick={()=>setProfileOpen(!profileOpen)} title="Profile" style={{width:"auto",padding:"4px 8px",gap:8}}>
            <div className="avatar" style={{width:26,height:26}}>AK</div>
            <Icon name="chev-d" size={13}/>
          </button>
          {profileOpen && (
            <div className="card" style={{position:"absolute",top:40,right:0,width:240,zIndex:40}}>
              <div style={{padding:"12px 14px",borderBottom:"1px solid var(--border)"}}>
                <div style={{fontWeight:600,fontSize:13.5}}>Anjali Kapoor</div>
                <div className="muted tiny">anjali.kapoor@acme.in</div>
              </div>
              <div style={{padding:6}}>
                {["Profile & preferences","Switch workspace","Keyboard shortcuts","Help center"].map(x=>(
                  <div key={x} className="nav-item" style={{margin:0}}>{x}</div>
                ))}
                <div className="divider" style={{margin:"6px 8px"}}/>
                <div className="nav-item" style={{margin:0,color:"var(--err)"}} onClick={onSignOut}>Sign out</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Breadcrumb({ items }){
  return (
    <nav className="breadcrumb">
      {items.map((it,i)=>(
        <React.Fragment key={i}>
          {i>0 && <span className="sep"><Icon name="chev-r" size={11}/></span>}
          {i===items.length-1
            ? <span style={{color:"var(--text-2)",fontWeight:550}}>{it.label}</span>
            : <a href="#" onClick={e=>{e.preventDefault(); it.onClick && it.onClick();}}>{it.label}</a>}
        </React.Fragment>
      ))}
    </nav>
  );
}

Object.assign(window, { Sidebar, Topbar, Breadcrumb, MODULE_GROUPS, ROUTE_MAP });
