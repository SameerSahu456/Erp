// Sales & CRM
function SalesView({ tab, setTab }){
  const M = window.MOCK;
  const tabs = [
    { id:"pipeline", label:"Pipeline" },
    { id:"customer", label:"Customer 360" },
    { id:"quote", label:"Quote → Order" },
  ];
  return (
    <>
      <Breadcrumb items={[
        {label:"Home"},
        {label:"Revenue"},
        {label: tab==="pipeline"?"Sales Pipeline":tab==="customer"?"Customer 360":"Quote-to-Order"}
      ]}/>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales & CRM</h1>
          <div className="page-sub">
            {tab==="pipeline" && "Drag deals across stages · 12 active · ₹4.88 Cr weighted"}
            {tab==="customer" && "Infosys BPM Limited · Customer since Mar 2021"}
            {tab==="quote" && "Q-4481 · Convert approved quote to sales order"}
          </div>
        </div>
        <div className="row">
          {tab==="pipeline" && <>
            <div className="seg"><button className="on">Board</button><button>List</button><button>Forecast</button></div>
            <button className="btn btn-primary"><Icon name="plus" size={13}/> New deal</button>
          </>}
          {tab==="customer" && <>
            <button className="btn"><Icon name="mail" size={13}/> Email</button>
            <button className="btn"><Icon name="phone" size={13}/> Log call</button>
            <button className="btn btn-primary"><Icon name="plus" size={13}/> New quote</button>
          </>}
          {tab==="quote" && <>
            <button className="btn"><Icon name="download" size={13}/> Download PDF</button>
            <button className="btn btn-primary"><Icon name="check" size={13}/> Convert to Order</button>
          </>}
        </div>
      </div>

      <div className="tabs">
        {tabs.map(t=>(
          <div key={t.id} className={"tab "+(tab===t.id?"active":"")} onClick={()=>setTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {tab==="pipeline" && <PipelineBoard/>}
      {tab==="customer" && <CustomerDetail/>}
      {tab==="quote" && <QuoteView/>}
    </>
  );
}

function PipelineBoard(){
  const [cols, setCols] = useState(window.MOCK.PIPELINE);
  const [dragging, setDragging] = useState(null);
  const total = Object.values(cols).flat().reduce((s,d)=>s+d.val, 0);

  const onDrop = (toStage) => {
    if (!dragging) return;
    const { card, fromStage } = dragging;
    if (fromStage === toStage) { setDragging(null); return; }
    const next = { ...cols };
    next[fromStage] = next[fromStage].filter(c => c.id !== card.id);
    next[toStage] = [card, ...next[toStage]];
    setCols(next);
    setDragging(null);
  };

  const stageColors = { Lead:"#98A2B3", Qualified:"#2D4A7C", Proposal:"#B54708", Negotiation:"#0F1B2D", Won:"#067647" };

  return (
    <>
      <div className="row" style={{marginBottom:14,gap:14,flexWrap:"wrap"}}>
        <div className="card card-pad" style={{padding:"12px 16px",flex:1,minWidth:180}}>
          <div className="muted tiny" style={{fontWeight:550,textTransform:"uppercase",letterSpacing:".06em"}}>Pipeline total</div>
          <div style={{fontSize:20,fontWeight:650,marginTop:4}} className="num">{window.MOCK.fmtINR(total)}</div>
        </div>
        <div className="card card-pad" style={{padding:"12px 16px",flex:2,minWidth:280}}>
          <div className="muted tiny" style={{fontWeight:550,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Distribution</div>
          <div className="pipe-bar">
            {Object.entries(cols).map(([k,v])=>{
              const sum = v.reduce((s,d)=>s+d.val,0);
              return <span key={k} style={{width:(sum/total*100)+"%",background:stageColors[k]}} title={k}/>;
            })}
          </div>
          <div className="legend" style={{marginTop:8,flexWrap:"wrap"}}>
            {Object.entries(cols).map(([k,v])=>(
              <span key={k} className="tiny"><span className="dot" style={{background:stageColors[k]}}/>{k} · {window.MOCK.fmtINR(v.reduce((s,d)=>s+d.val,0))}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="kanban">
        {Object.entries(cols).map(([stage, deals])=>{
          const sum = deals.reduce((s,d)=>s+d.val,0);
          return (
            <div key={stage} className="kcol"
              onDragOver={e=>{e.preventDefault()}}
              onDrop={()=>onDrop(stage)}>
              <div className="kcol-h">
                <span><span className="bdot" style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:stageColors[stage],marginRight:6}}/>{stage}<span className="count" style={{marginLeft:8}}>{deals.length}</span></span>
                <span className="num tiny muted">{window.MOCK.fmtINR(sum)}</span>
              </div>
              {deals.map(d=>(
                <div key={d.id} className="kcard"
                  draggable
                  onDragStart={()=>setDragging({card:d, fromStage:stage})}
                  style={{opacity: dragging?.card.id===d.id?0.4:1}}>
                  <div className="cname">{d.name}</div>
                  <div className="muted tiny">{d.contact}</div>
                  <div className="cmeta">
                    <span>{d.daysIn}d in stage · <span className="tag">{d.owner}</span></span>
                    <span className="cval num">{window.MOCK.fmtINR(d.val)}</span>
                  </div>
                </div>
              ))}
              <button className="btn btn-sm btn-ghost" style={{width:"100%",justifyContent:"center",color:"var(--text-3)"}}>
                <Icon name="plus" size={12}/> Add deal
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function CustomerDetail(){
  const c = window.MOCK.CUSTOMER;
  const [subTab, setSubTab] = useState("activity");
  return (
    <>
      <div className="detail-head">
        <div className="detail-avatar">IB</div>
        <div style={{flex:1}}>
          <h2 className="detail-title">{c.name}</h2>
          <div className="detail-sub">{c.id} · {c.industry} · {c.city}</div>
        </div>
        <div className="row">
          <span className="badge ok"><span className="bdot"/>Active · Strategic</span>
          <div className="tag" style={{background:"var(--ok-bg)",color:"var(--ok)",padding:"3px 10px",fontWeight:600}}>Health {c.healthScore}</div>
        </div>
      </div>

      <div className="grid-3" style={{marginBottom:20}}>
        {[
          ["Lifetime value", window.MOCK.fmtINRFull(c.ltv), "Since "+c.since],
          ["Open AR", window.MOCK.fmtINRFull(c.openAR), "2 invoices · 18 days avg"],
          ["Open deals", c.openDeals+" · ₹73.7 L", "Next close: May 15, 2026"],
        ].map(([k,v,s])=>(
          <div key={k} className="card card-pad">
            <div className="muted tiny" style={{fontWeight:550,textTransform:"uppercase",letterSpacing:".06em"}}>{k}</div>
            <div style={{fontSize:22,fontWeight:650,marginTop:6}} className="num">{v}</div>
            <div className="muted tiny" style={{marginTop:2}}>{s}</div>
          </div>
        ))}
      </div>

      <div className="split">
        <div className="card">
          <div className="card-header" style={{paddingBottom:0,borderBottom:"none"}}>
            <div className="tabs" style={{margin:0,borderBottom:"none"}}>
              {[["activity","Activity"],["deals","Open Deals"],["invoices","Invoices"],["contacts","Contacts"]].map(([id,l])=>(
                <div key={id} className={"tab "+(subTab===id?"active":"")} onClick={()=>setSubTab(id)}>{l}</div>
              ))}
            </div>
          </div>
          <div className="card-pad" style={{paddingTop:14}}>
            {subTab==="activity" && (
              <div>
                {window.MOCK.CUSTOMER_ACTIVITY.map((a,i)=>(
                  <div key={i} className="row" style={{alignItems:"flex-start",padding:"10px 0",borderBottom:i<3?"1px solid var(--border)":"none",gap:12}}>
                    <div className="alert-ico info" style={{width:30,height:30}}><Icon name={a.t==="Call"?"phone":a.t==="Email"?"mail":a.t==="Meeting"?"users":"file"} size={13}/></div>
                    <div style={{flex:1}}>
                      <div className="row between">
                        <div style={{fontSize:13,fontWeight:600}}>{a.t} · <span className="muted" style={{fontWeight:500}}>{a.who}</span></div>
                        <div className="muted tiny">{a.when}</div>
                      </div>
                      <div className="muted" style={{fontSize:12.5,marginTop:3}}>{a.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {subTab==="deals" && (
              <table className="tbl">
                <thead><tr><th>Deal</th><th>Stage</th><th className="right">Value</th><th>Close</th></tr></thead>
                <tbody>
                  <tr><td style={{fontWeight:550}}>Infosys BPM — AMC Renewal FY26</td><td><span className="badge warn"><span className="bdot"/>Proposal</span></td><td className="right num">{window.MOCK.fmtINRFull(6200000)}</td><td className="muted">May 15</td></tr>
                  <tr><td style={{fontWeight:550}}>Bengaluru Campus Expansion</td><td><span className="badge neutral"><span className="bdot"/>Qualified</span></td><td className="right num">{window.MOCK.fmtINRFull(1170000)}</td><td className="muted">Jun 30</td></tr>
                </tbody>
              </table>
            )}
            {subTab==="invoices" && (
              <div className="state">
                <div className="state-ico"><Icon name="file" size={20}/></div>
                <h3>No open invoices</h3>
                <p>All invoices for this customer are settled. Last payment cleared on Apr 02, 2026.</p>
              </div>
            )}
            {subTab==="contacts" && (
              <table className="tbl">
                <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th></tr></thead>
                <tbody>
                  <tr><td style={{fontWeight:550}}>Manoj Nair</td><td className="muted">VP · Procurement</td><td className="muted">m.nair@infosysbpm.com</td><td className="muted">+91 80 2852 0261</td></tr>
                  <tr><td style={{fontWeight:550}}>Rajeshwari Iyer</td><td className="muted">Director · Facilities</td><td className="muted">r.iyer@infosysbpm.com</td><td className="muted">+91 80 2852 0244</td></tr>
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Account details</div></div>
          <div className="card-pad">
            {[
              ["Account owner", c.owner],
              ["Website", c.website],
              ["Email", c.email],
              ["Phone", c.phone],
              ["Last interaction", c.lastInteraction],
              ["Customer since", c.since],
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

function QuoteView(){
  const q = window.MOCK.QUOTE;
  const [lines, setLines] = useState(q.lines);
  const [convert, setConvert] = useState(false);
  const subtotal = lines.reduce((s,l)=>s + l.qty*l.rate, 0);
  const tax = lines.reduce((s,l)=>s + l.qty*l.rate*l.tax/100, 0);
  const total = subtotal + tax;

  const updateQty = (idx, val) => {
    const n = [...lines];
    n[idx] = { ...n[idx], qty: Math.max(0, +val||0) };
    setLines(n);
  };

  return (
    <>
      <div className="row between" style={{marginBottom:16,padding:"12px 16px",background:"var(--info-bg)",border:"1px solid #D1E4FF",borderRadius:10}}>
        <div className="row" style={{gap:10}}>
          <div className="alert-ico info"><Icon name="check" size={14}/></div>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>Quote {q.id} approved by customer on Apr 17, 2026</div>
            <div className="muted tiny">Ready to convert to sales order. Inventory will be allocated on confirmation.</div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={()=>setConvert(true)}><Icon name="arrow-right" size={13}/> Convert now</button>
      </div>

      <div className="split">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Quote {q.id}</div>
              <div className="card-sub">{q.customer} · Valid until {q.validTill}</div>
            </div>
            <div className="row">
              <button className="btn btn-sm"><Icon name="edit" size={12}/> Edit</button>
              <button className="btn btn-sm"><Icon name="plus" size={12}/> Add line</button>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>SKU / Item</th>
                <th className="right">Qty</th>
                <th className="right">Rate</th>
                <th className="right">Tax</th>
                <th className="right">Line total</th>
                <th style={{width:30}}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l,i)=>(
                <tr key={i}>
                  <td>
                    <div style={{fontWeight:550}}>{l.name}</div>
                    <div className="mono muted tiny">{l.sku}</div>
                  </td>
                  <td className="right">
                    <input className="input num" value={l.qty} onChange={e=>updateQty(i, e.target.value)} style={{width:70,textAlign:"right",padding:"3px 8px"}}/>
                  </td>
                  <td className="right num">{window.MOCK.fmtINRFull(l.rate)}</td>
                  <td className="right muted num">{l.tax}%</td>
                  <td className="right num" style={{fontWeight:600}}>{window.MOCK.fmtINRFull(l.qty*l.rate*(1+l.tax/100))}</td>
                  <td><button className="icon-btn" style={{width:24,height:24}}><Icon name="x" size={12}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{padding:"16px 20px",borderTop:"1px solid var(--border)"}}>
            <div className="row between" style={{marginBottom:6}}>
              <div className="muted">Subtotal</div>
              <div className="num">{window.MOCK.fmtINRFull(subtotal)}</div>
            </div>
            <div className="row between" style={{marginBottom:6}}>
              <div className="muted">GST (18%)</div>
              <div className="num">{window.MOCK.fmtINRFull(Math.round(tax))}</div>
            </div>
            <div className="row between" style={{paddingTop:10,borderTop:"1px solid var(--border)",fontWeight:650,fontSize:15}}>
              <div>Total</div>
              <div className="num">{window.MOCK.fmtINRFull(Math.round(total))}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Conversion checklist</div></div>
          <div className="card-pad">
            {[
              ["Customer PO received", true, "PO-INF-4421 attached"],
              ["Inventory availability", true, "All 4 lines in stock"],
              ["Credit check", true, "₹2 Cr limit available"],
              ["Delivery date confirmed", false, "Pending logistics input"],
              ["Tax code validated", true, "GST 18% · IGST not applicable"],
            ].map(([l,ok,sub],i)=>(
              <div key={i} className="row" style={{gap:10,padding:"10px 0",borderBottom:i<4?"1px solid var(--border)":"none",alignItems:"flex-start"}}>
                <div style={{width:20,height:20,borderRadius:"50%",background: ok?"var(--ok-bg)":"var(--warn-bg)",color: ok?"var(--ok)":"var(--warn)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                  <Icon name={ok?"check":"clock"} size={12}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:550}}>{l}</div>
                  <div className="muted tiny" style={{marginTop:2}}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {convert && (
        <div onClick={()=>setConvert(false)} style={{position:"fixed",inset:0,background:"rgba(15,27,45,0.4)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div className="card" onClick={e=>e.stopPropagation()} style={{width:420,boxShadow:"var(--shadow-lg)"}}>
            <div className="card-header"><div className="card-title">Convert Q-4481 to Sales Order</div><button className="icon-btn" style={{width:26,height:26}} onClick={()=>setConvert(false)}><Icon name="x" size={14}/></button></div>
            <div className="card-pad">
              <p style={{marginTop:0,color:"var(--text-2)"}}>This will create Sales Order <strong>SO-8872</strong>, allocate inventory, and notify the customer. Proceed?</p>
              <div className="field">
                <label className="field-label">Expected ship date</label>
                <input className="input" type="date" defaultValue="2026-04-25"/>
              </div>
              <div className="field">
                <label className="field-label">Notes for warehouse</label>
                <textarea className="textarea" rows="3" placeholder="Optional shipment instructions…"/>
              </div>
              <div className="row end" style={{gap:8,marginTop:10}}>
                <button className="btn" onClick={()=>setConvert(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={()=>{setConvert(false); window.__toast && window.__toast("Sales Order SO-8872 created");}}>Create order</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

window.SalesView = SalesView;
