// App root
function App(){
  const [signedIn, setSignedIn] = useState(() => localStorage.getItem("cp_signed_in") === "1");
  const [workspace, setWorkspace] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cp_workspace")) || window.MOCK.WORKSPACES[0]; } catch { return window.MOCK.WORKSPACES[0]; }
  });
  const [page, setPage] = useState(() => localStorage.getItem("cp_page") || "dashboard");
  const [subTab, setSubTab] = useState(() => localStorage.getItem("cp_tab") || null);
  const [activeNav, setActiveNav] = useState(() => localStorage.getItem("cp_nav") || "home");
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("cp_collapsed")==="1");
  const [toast, setToast] = useState(null);

  useEffect(()=>{ localStorage.setItem("cp_page", page); }, [page]);
  useEffect(()=>{ if (subTab) localStorage.setItem("cp_tab", subTab); }, [subTab]);
  useEffect(()=>{ localStorage.setItem("cp_nav", activeNav); }, [activeNav]);
  useEffect(()=>{ localStorage.setItem("cp_collapsed", collapsed?"1":"0"); }, [collapsed]);

  window.__toast = (msg) => {
    setToast(msg);
    setTimeout(()=>setToast(null), 2400);
  };

  const onSignIn = (ws) => {
    setWorkspace(ws);
    localStorage.setItem("cp_workspace", JSON.stringify(ws));
    localStorage.setItem("cp_signed_in", "1");
    setSignedIn(true);
  };
  const onSignOut = () => {
    localStorage.removeItem("cp_signed_in");
    setSignedIn(false);
  };

  const onNav = (navId) => {
    setActiveNav(navId);
    const route = window.ROUTE_MAP[navId];
    if (route) {
      setPage(route.page);
      if (route.tab) setSubTab(route.tab);
      else {
        // default sub tab per module
        const defaults = { dashboard:null, inventory:"stock", sales:"pipeline", reports:"builder", settings:"roles" };
        setSubTab(defaults[route.page]);
      }
    }
  };

  if (!signedIn) return <LoginView onSignIn={onSignIn}/>;

  return (
    <div className="app">
      <Sidebar activeNav={activeNav} onNav={onNav} collapsed={collapsed} setCollapsed={setCollapsed}/>
      <div className="main">
        <Topbar onToggleSidebar={()=>setCollapsed(!collapsed)} onSignOut={onSignOut}/>
        <div className="content">
          {page === "dashboard" && <Dashboard onNav={onNav}/>}
          {page === "inventory" && <InventoryView tab={subTab||"stock"} setTab={(t)=>{setSubTab(t); setActiveNav(t==="po"?"purchasing":t==="supplier"?"suppliers":"inventory-root");}}/>}
          {page === "sales" && <SalesView tab={subTab||"pipeline"} setTab={(t)=>{setSubTab(t); setActiveNav(t==="customer"?"customers":t==="quote"?"quotes":"sales-root");}}/>}
          {page === "reports" && <ReportsView tab={subTab||"builder"} setTab={(t)=>{setSubTab(t); setActiveNav(t==="scheduled"?"scheduled":t==="builder"?"builder":"reports");}}/>}
          {page === "settings" && <SettingsView tab={subTab||"roles"} setTab={(t)=>{setSubTab(t); setActiveNav(t==="integrations"?"integrations":t==="audit"?"audit":"users");}}/>}
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
