// App-print: render all major screens stacked for PDF export
function PrintApp(){
  const screens = [
    { title: "01 · Login & Workspace", content: <LoginSnapshot/> },
    { title: "02 · Global Dashboard", content: <ScreenShell page="dashboard" activeNav="home"><Dashboard onNav={()=>{}}/></ScreenShell> },
    { title: "03 · Inventory · Stock Levels", content: <ScreenShell page="inventory" activeNav="inventory-root"><InventoryView tab="stock" setTab={()=>{}}/></ScreenShell> },
    { title: "04 · Inventory · Purchase Orders", content: <ScreenShell page="inventory" activeNav="purchasing"><InventoryView tab="po" setTab={()=>{}}/></ScreenShell> },
    { title: "05 · Inventory · Supplier Detail", content: <ScreenShell page="inventory" activeNav="suppliers"><InventoryView tab="supplier" setTab={()=>{}}/></ScreenShell> },
    { title: "06 · Sales · Pipeline", content: <ScreenShell page="sales" activeNav="sales-root"><SalesView tab="pipeline" setTab={()=>{}}/></ScreenShell> },
    { title: "07 · Sales · Customer 360", content: <ScreenShell page="sales" activeNav="customers"><SalesView tab="customer" setTab={()=>{}}/></ScreenShell> },
    { title: "08 · Sales · Quote → Order", content: <ScreenShell page="sales" activeNav="quotes"><SalesView tab="quote" setTab={()=>{}}/></ScreenShell> },
    { title: "09 · Reports · Builder", content: <ScreenShell page="reports" activeNav="builder"><ReportsView tab="builder" setTab={()=>{}}/></ScreenShell> },
    { title: "10 · Reports · Scheduled", content: <ScreenShell page="reports" activeNav="scheduled"><ReportsViewScheduledStatic/></ScreenShell> },
    { title: "11 · Settings · Roles & Permissions", content: <ScreenShell page="settings" activeNav="users"><SettingsView tab="roles" setTab={()=>{}}/></ScreenShell> },
    { title: "12 · Settings · Audit Log", content: <ScreenShell page="settings" activeNav="audit"><SettingsView tab="audit" setTab={()=>{}}/></ScreenShell> },
    { title: "13 · Settings · Integrations", content: <ScreenShell page="settings" activeNav="integrations"><SettingsView tab="integrations" setTab={()=>{}}/></ScreenShell> },
  ];
  return (
    <div>
      {screens.map((s,i)=>(
        <div key={i} className="print-page">
          <div className="print-label">Comprint ERP · {s.title}</div>
          <div className="print-frame">{s.content}</div>
        </div>
      ))}
    </div>
  );
}

function ScreenShell({ children, activeNav }){
  return (
    <div className="app" style={{minHeight:"auto"}}>
      <Sidebar activeNav={activeNav} onNav={()=>{}} collapsed={false} setCollapsed={()=>{}}/>
      <div className="main">
        <Topbar onToggleSidebar={()=>{}} onSignOut={()=>{}}/>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

function LoginSnapshot(){ return <LoginView onSignIn={()=>{}}/>; }

// Bypass the scheduled-reports loading skeleton for print
function ReportsViewScheduledStatic(){
  const R = window.MOCK.REPORTS;
  return (
    <>
      <Breadcrumb items={[{label:"Home"},{label:"Analytics"},{label:"Scheduled"}]}/>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <div className="page-sub">Manage automated report schedules</div>
        </div>
        <div className="row"><button className="btn"><Icon name="filter" size={13}/> Filter</button><button className="btn btn-primary"><Icon name="plus" size={13}/> New schedule</button></div>
      </div>
      <div className="tabs">
        <div className="tab">Report Builder</div>
        <div className="tab active">Scheduled Reports</div>
        <div className="tab">Library</div>
      </div>
      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="search-field"><Icon name="search" size={14}/><input placeholder="Search scheduled reports…"/></div>
          <button className="filter-chip on">All</button>
          <button className="filter-chip">Active</button>
          <button className="filter-chip">Paused</button>
        </div>
        <table className="tbl">
          <thead><tr><th className="chk"><span className="cb"/></th><th>Report</th><th>Owner</th><th>Schedule</th><th>Last run</th><th>Next run</th><th>Format</th><th>Status</th><th style={{width:40}}></th></tr></thead>
          <tbody>
            {R.map((r,i)=>(
              <tr key={i}>
                <td><span className="cb"/></td>
                <td style={{fontWeight:550}}>{r.name}</td>
                <td className="muted">{r.owner}</td>
                <td className="muted">{r.freq}</td>
                <td className="muted">{r.lastRun}</td>
                <td className="muted">{r.next}</td>
                <td className="mono tiny">{r.format}</td>
                <td><span className={"badge "+(r.status==="Active"?"ok":"neutral")}><span className="bdot"/>{r.status}</span></td>
                <td><button className="icon-btn" style={{width:26,height:26}}><Icon name="dots" size={14}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<PrintApp/>);

// Auto-print after fonts + Babel finish
(async ()=>{
  try { await document.fonts.ready; } catch(e){}
  setTimeout(()=>{ try{ window.print(); } catch(e){} }, 1500);
})();
