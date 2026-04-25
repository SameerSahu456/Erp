// Inventory & Supply Chain
function InventoryView({ tab, setTab }){
  const M = window.MOCK;
  const tabs = [
    { id:"stock", label:"Stock Levels" },
    { id:"po", label:"Purchase Orders" },
    { id:"supplier", label:"Supplier Detail" },
  ];
  return (
    <>
      <Breadcrumb items={[
        {label:"Home"},
        {label:"Operations"},
        {label: tab==="stock"?"Inventory":tab==="po"?"Purchase Orders":"Supplier Detail"}
      ]}/>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory & Supply Chain</h1>
          <div className="page-sub">{tab==="stock"? "Real-time stock across 6 warehouses · 2,148 active Part nos" : tab==="po"?"Manage purchase orders and vendor approvals":"Bosch Rexroth India Pvt Ltd · Supplier profile"}</div>
        </div>
        <div className="row">
          {tab==="stock" && <><button className="btn"><Icon name="upload" size={13}/> Import CSV</button><button className="btn btn-primary"><Icon name="plus" size={13}/> New Part no</button></>}
          {tab==="po" && <><button className="btn"><Icon name="download" size={13}/> Export</button><button className="btn btn-primary"><Icon name="plus" size={13}/> New PO</button></>}
          {tab==="supplier" && <><button className="btn"><Icon name="mail" size={13}/> Email</button><button className="btn btn-primary"><Icon name="plus" size={13}/> New PO</button></>}
        </div>
      </div>

      <div className="tabs">
        {tabs.map(t=>(
          <div key={t.id} className={"tab "+(tab===t.id?"active":"")} onClick={()=>setTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {tab==="stock" && <StockTable/>}
      {tab==="po" && <POTable/>}
      {tab==="supplier" && <SupplierDetail/>}
    </>
  );
}

function StockTable(){
  const M = window.MOCK;
  const [wh, setWh] = useState("All warehouses");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("qty");
  const [sortDir, setSortDir] = useState("asc");
  const [selected, setSelected] = useState(new Set());
  const [editCell, setEditCell] = useState(null);
  const [rows, setRows] = useState(M.STOCK);

  const filtered = useMemo(()=>{
    let r = rows.filter(x =>
      (wh==="All warehouses" || x.wh === wh) &&
      (statusFilter==="all" || x.status === statusFilter) &&
      (query==="" || (x.name+x.sku).toLowerCase().includes(query.toLowerCase()))
    );
    r = [...r].sort((a,b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === "number" ? av-bv : String(av).localeCompare(String(bv));
      return sortDir==="asc" ? cmp : -cmp;
    });
    return r;
  }, [rows, wh, statusFilter, query, sortKey, sortDir]);

  const toggleAll = ()=> {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(r=>r.sku)));
  };
  const toggle = (sku)=> {
    const n = new Set(selected);
    n.has(sku) ? n.delete(sku) : n.add(sku);
    setSelected(n);
  };
  const setSort = (k) => {
    if (sortKey === k) setSortDir(sortDir==="asc"?"desc":"asc");
    else { setSortKey(k); setSortDir("asc"); }
  };
  const updateQty = (sku, q) => setRows(rows.map(r => r.sku===sku ? { ...r, qty: +q || 0, value: (+q||0) * Math.round(r.value / Math.max(r.qty,1)) } : r));

  const lowCount = M.STOCK.filter(x=>x.status==="low"||x.status==="crit"||x.status==="out").length;

  return (
    <>
      <div className="row" style={{gap:12,marginBottom:14}}>
        <div className="card card-pad" style={{flex:1,padding:"12px 16px"}}>
          <div className="row between">
            <div>
              <div className="muted tiny" style={{fontWeight:550,textTransform:"uppercase",letterSpacing:".06em"}}>Low / Out of Stock</div>
              <div style={{fontSize:18,fontWeight:650,marginTop:4}} className="num">{lowCount} Part nos</div>
            </div>
            <div className="alert-ico warn"><Icon name="warn" size={16}/></div>
          </div>
        </div>
        <div className="card card-pad" style={{flex:1,padding:"12px 16px"}}>
          <div className="row between">
            <div>
              <div className="muted tiny" style={{fontWeight:550,textTransform:"uppercase",letterSpacing:".06em"}}>On Hand Value</div>
              <div style={{fontSize:18,fontWeight:650,marginTop:4}} className="num">₹18.47 Cr</div>
            </div>
            <Icon name="box" size={18} className="muted"/>
          </div>
        </div>
        <div className="card card-pad" style={{flex:1,padding:"12px 16px"}}>
          <div className="row between">
            <div>
              <div className="muted tiny" style={{fontWeight:550,textTransform:"uppercase",letterSpacing:".06em"}}>Open POs</div>
              <div style={{fontSize:18,fontWeight:650,marginTop:4}} className="num">24</div>
            </div>
            <Icon name="truck" size={18} className="muted"/>
          </div>
        </div>
        <div className="card card-pad" style={{flex:1,padding:"12px 16px"}}>
          <div className="row between">
            <div>
              <div className="muted tiny" style={{fontWeight:550,textTransform:"uppercase",letterSpacing:".06em"}}>Turnover (YTD)</div>
              <div style={{fontSize:18,fontWeight:650,marginTop:4}} className="num">5.8×</div>
            </div>
            <Icon name="chart" size={18} className="muted"/>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="search-field">
            <Icon name="search" size={14}/>
            <input placeholder="Search Part no or product name…" value={query} onChange={e=>setQuery(e.target.value)}/>
          </div>
          <select className="select" style={{width:"auto"}} value={wh} onChange={e=>setWh(e.target.value)}>
            {window.MOCK.WAREHOUSES.map(w=>(<option key={w}>{w}</option>))}
          </select>
          <button className={"filter-chip "+(statusFilter==="all"?"on":"")} onClick={()=>setStatusFilter("all")}>All</button>
          <button className={"filter-chip "+(statusFilter==="in"?"on":"")} onClick={()=>setStatusFilter("in")}>In stock</button>
          <button className={"filter-chip "+(statusFilter==="low"?"on":"")} onClick={()=>setStatusFilter("low")}>Low</button>
          <button className={"filter-chip "+(statusFilter==="crit"?"on":"")} onClick={()=>setStatusFilter("crit")}>Critical</button>
          <button className={"filter-chip "+(statusFilter==="out"?"on":"")} onClick={()=>setStatusFilter("out")}>Out</button>
          <div style={{marginLeft:"auto"}} className="row">
            {selected.size > 0 && (
              <>
                <span className="muted tiny">{selected.size} selected</span>
                <button className="btn btn-sm"><Icon name="truck" size={12}/> Create PO</button>
                <button className="btn btn-sm"><Icon name="edit" size={12}/> Bulk edit</button>
                <button className="btn btn-sm btn-danger"><Icon name="trash" size={12}/></button>
              </>
            )}
            <button className="btn btn-sm"><Icon name="filter" size={12}/> More filters</button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="state">
            <div className="state-ico"><Icon name="inbox" size={20}/></div>
            <h3>No Part nos match these filters</h3>
            <p>Try clearing filters or search for a different Part no / product name.</p>
            <button className="btn" onClick={()=>{setWh("All warehouses");setStatusFilter("all");setQuery("")}}>Clear all filters</button>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th className="chk"><span className={"cb "+(selected.size===filtered.length?"on":"")} onClick={toggleAll}/></th>
                <th onClick={()=>setSort("sku")}>Part no <span className="srt">↕</span></th>
                <th onClick={()=>setSort("name")}>Product <span className="srt">↕</span></th>
                <th onClick={()=>setSort("wh")}>Warehouse <span className="srt">↕</span></th>
                <th className="right" onClick={()=>setSort("qty")}>On hand <span className="srt">↕</span></th>
                <th className="right">Reorder at</th>
                <th className="right" onClick={()=>setSort("value")}>Value <span className="srt">↕</span></th>
                <th>Status</th>
                <th style={{width:40}}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.sku} className={selected.has(r.sku)?"selected":""}>
                  <td><span className={"cb "+(selected.has(r.sku)?"on":"")} onClick={()=>toggle(r.sku)}/></td>
                  <td className="mono" style={{color:"var(--text-2)"}}>{r.sku}</td>
                  <td style={{fontWeight:550}}>{r.name}</td>
                  <td className="muted">{r.wh}</td>
                  <td className="right">
                    {editCell === r.sku ? (
                      <input className="input" autoFocus defaultValue={r.qty} style={{width:80,textAlign:"right",padding:"3px 8px"}}
                        onBlur={(e)=>{ updateQty(r.sku, e.target.value); setEditCell(null); }}
                        onKeyDown={(e)=>{ if (e.key==="Enter"){ updateQty(r.sku, e.target.value); setEditCell(null); } }}/>
                    ) : (
                      <span className="inline-edit num" onClick={()=>setEditCell(r.sku)}>{r.qty.toLocaleString("en-IN")} {r.uom}</span>
                    )}
                  </td>
                  <td className="right num muted">{r.reorder}</td>
                  <td className="right num" style={{fontWeight:550}}>{window.MOCK.fmtINRFull(r.value)}</td>
                  <td>
                    {r.status==="in" && <span className="badge ok"><span className="bdot"/>In stock</span>}
                    {r.status==="low" && <span className="badge warn"><span className="bdot"/>Low</span>}
                    {r.status==="crit" && <span className="badge err"><span className="bdot"/>Critical</span>}
                    {r.status==="out" && <span className="badge err"><span className="bdot"/>Out</span>}
                  </td>
                  <td><button className="icon-btn" style={{width:26,height:26}}><Icon name="dots" size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="row between" style={{padding:"10px 14px",borderTop:"1px solid var(--border)",fontSize:12.5,color:"var(--text-3)"}}>
          <div>Showing {filtered.length} of {window.MOCK.STOCK.length} Part nos</div>
          <div className="row" style={{gap:4}}>
            <button className="btn btn-sm" disabled><Icon name="chev-l" size={12}/></button>
            <button className="btn btn-sm">1</button>
            <button className="btn btn-sm" style={{background:"var(--primary)",color:"#fff",borderColor:"var(--primary)"}}>2</button>
            <button className="btn btn-sm">3</button>
            <button className="btn btn-sm">…</button>
            <button className="btn btn-sm">18</button>
            <button className="btn btn-sm"><Icon name="chev-r" size={12}/></button>
          </div>
        </div>
      </div>
    </>
  );
}

function POTable(){
  const M = window.MOCK;
  const steps = ["Draft","Pending approval","Approved","In transit","Received","Invoiced"];
  const currentStep = 1;
  return (
    <>
      <div className="card" style={{marginBottom:20}}>
        <div className="card-header">
          <div><div className="card-title">PO-10482 · Workflow</div><div className="card-sub">Tata Steel Ltd · ₹6,42,000 · Created Apr 16 by Rohan Mehta</div></div>
          <div className="row">
            <button className="btn btn-sm btn-danger">Reject</button>
            <button className="btn btn-sm btn-primary">Approve</button>
          </div>
        </div>
        <div style={{padding:"22px 22px 14px"}}>
          <div className="row" style={{gap:0,alignItems:"center",flexWrap:"wrap"}}>
            {steps.map((s,i)=>(
              <React.Fragment key={s}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,minWidth:90}}>
                  <div style={{
                    width:28,height:28,borderRadius:"50%",
                    background: i<currentStep ? "var(--primary)" : i===currentStep ? "var(--warn-bg)" : "var(--bg-muted)",
                    color: i<currentStep ? "#fff" : i===currentStep ? "var(--warn)" : "var(--text-3)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    border: i===currentStep ? "2px solid var(--warn)":"none",
                    fontSize:12,fontWeight:650
                  }}>
                    {i<currentStep ? <Icon name="check" size={14}/> : i+1}
                  </div>
                  <div style={{fontSize:12,fontWeight:550,color: i<=currentStep?"var(--text)":"var(--text-3)",textAlign:"center"}}>{s}</div>
                </div>
                {i<steps.length-1 && <div style={{flex:1,height:2,background: i<currentStep?"var(--primary)":"var(--border)",marginTop:-20}}/>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="search-field"><Icon name="search" size={14}/><input placeholder="Search PO ID or vendor…"/></div>
          <button className="filter-chip on">All</button>
          <button className="filter-chip">Pending</button>
          <button className="filter-chip">Approved</button>
          <button className="filter-chip">In transit</button>
          <button className="filter-chip">Received</button>
          <div style={{marginLeft:"auto"}}><button className="btn btn-sm"><Icon name="calendar" size={12}/> Apr 2026</button></div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th className="chk"><span className="cb"/></th>
              <th>PO #</th>
              <th>Vendor</th>
              <th className="right">Items</th>
              <th className="right">Amount</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{width:40}}></th>
            </tr>
          </thead>
          <tbody>
            {M.PURCHASE_ORDERS.map(p=>(
              <tr key={p.id}>
                <td><span className="cb"/></td>
                <td className="mono" style={{color:"var(--text-2)"}}>{p.id}</td>
                <td style={{fontWeight:550}}>{p.vendor}</td>
                <td className="right num muted">{p.items}</td>
                <td className="right num" style={{fontWeight:550}}>{M.fmtINRFull(p.amount)}</td>
                <td><span className={"badge "+p.badge}><span className="bdot"/>{p.status}</span></td>
                <td className="muted">{p.date}</td>
                <td><button className="icon-btn" style={{width:26,height:26}}><Icon name="dots" size={14}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SupplierDetail(){
  const s = window.MOCK.SUPPLIER;
  return (
    <>
      <div className="detail-head">
        <div className="detail-avatar">BR</div>
        <div style={{flex:1}}>
          <h2 className="detail-title">{s.name}</h2>
          <div className="detail-sub">{s.id} · {s.address}</div>
        </div>
        <span className="badge ok"><span className="bdot"/>Preferred · Rating A</span>
        <button className="btn"><Icon name="ext" size={13}/> View contract</button>
      </div>

      <div className="grid-3" style={{marginBottom:20}}>
        <div className="card card-pad">
          <div className="muted tiny" style={{fontWeight:550,textTransform:"uppercase",letterSpacing:".06em"}}>On-time delivery</div>
          <div style={{fontSize:22,fontWeight:650,marginTop:6}} className="num">{s.onTime}%</div>
          <div className="muted tiny" style={{marginTop:2}}>Last 12 months · 38 shipments</div>
        </div>
        <div className="card card-pad">
          <div className="muted tiny" style={{fontWeight:550,textTransform:"uppercase",letterSpacing:".06em"}}>YTD Spend</div>
          <div style={{fontSize:22,fontWeight:650,marginTop:6}} className="num">{window.MOCK.fmtINRFull(s.ytdSpend)}</div>
          <div className="muted tiny" style={{marginTop:2}}>Rank: 4 of 182 suppliers</div>
        </div>
        <div className="card card-pad">
          <div className="muted tiny" style={{fontWeight:550,textTransform:"uppercase",letterSpacing:".06em"}}>Open POs</div>
          <div style={{fontSize:22,fontWeight:650,marginTop:6}} className="num">{s.openPos}</div>
          <div className="muted tiny" style={{marginTop:2}}>{s.leadTime} lead · {s.paymentTerms}</div>
        </div>
      </div>

      <div className="split">
        <div className="card">
          <div className="card-header"><div className="card-title">Recent Purchase Orders</div><a href="#" onClick={e=>e.preventDefault()} className="muted tiny">View all</a></div>
          <table className="tbl">
            <thead><tr><th>PO #</th><th>Items</th><th className="right">Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {window.MOCK.PURCHASE_ORDERS.slice(0,4).map(p=>(
                <tr key={p.id}>
                  <td className="mono">{p.id}</td>
                  <td className="muted">{p.items} items</td>
                  <td className="right num" style={{fontWeight:550}}>{window.MOCK.fmtINRFull(p.amount)}</td>
                  <td><span className={"badge "+p.badge}><span className="bdot"/>{p.status}</span></td>
                  <td className="muted">{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Supplier Info</div></div>
          <div className="card-pad">
            {[
              ["Contact", s.contact],
              ["GSTIN", s.gst],
              ["PAN", s.pan],
              ["Payment terms", s.paymentTerms],
              ["Currency", s.currency],
              ["Avg lead time", s.leadTime],
            ].map(([k,v])=>(
              <div key={k} style={{padding:"9px 0",borderBottom:"1px solid var(--border)",display:"flex",gap:10}}>
                <div className="muted tiny" style={{width:120,fontWeight:550}}>{k}</div>
                <div style={{fontSize:13,flex:1}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

window.InventoryView = InventoryView;
