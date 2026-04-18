// Global Dashboard
function Dashboard({ onNav }){
  const M = window.MOCK;
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good afternoon, Anjali.</h1>
          <div className="page-sub">Here's what's happening across Acme Industries today — Apr 18, 2026.</div>
        </div>
        <div className="row">
          <div className="seg">
            <button className="on">Today</button>
            <button>MTD</button>
            <button>QTD</button>
            <button>YTD</button>
          </div>
          <button className="btn"><Icon name="download" size={13}/> Export</button>
          <button className="btn btn-primary"><Icon name="plus" size={13}/> New</button>
        </div>
      </div>

      <div className="kpi-grid">
        {M.KPIS.map((k,i)=>(
          <div className="kpi" key={i}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value num">{k.value}</div>
            <div className="kpi-delta">
              <span className={k.dir==="up"?"up":"down"}>
                <Icon name={k.dir==="up"?"arrow-up":"arrow-down"} size={11}/> {k.delta}
              </span>
              <span className="muted">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="split" style={{marginBottom:20}}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Cash Flow</div>
              <div className="card-sub">Rolling 6 months · in ₹ lakhs</div>
            </div>
            <div className="row">
              <div className="legend">
                <span><span className="dot" style={{background:"#0F1B2D"}}/>Inflow</span>
                <span><span className="dot" style={{background:"#98A2B3"}}/>Outflow</span>
              </div>
              <div className="seg">
                <button className="on">Month</button>
                <button>Quarter</button>
              </div>
            </div>
          </div>
          <div className="card-pad">
            <CashflowChart data={M.CASHFLOW}/>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Alerts</div>
            <a href="#" onClick={e=>e.preventDefault()} className="muted tiny">View all</a>
          </div>
          <div style={{padding:"6px 18px 12px"}}>
            {M.ALERTS.map((a,i)=>(
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
      </div>

      <div className="split-3">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Open Orders by Stage</div>
            <a href="#" onClick={e=>{e.preventDefault();onNav("sales-root")}} className="muted tiny">Open Sales →</a>
          </div>
          <div className="card-pad">
            <OrdersBar/>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Quick Links</div></div>
          <div style={{padding:"10px 10px 14px"}}>
            {[
              { id:"inventory-root", label:"Inventory & Supply Chain", icon:"box", sub:"Stock, POs, suppliers" },
              { id:"sales-root", label:"Sales & CRM", icon:"briefcase", sub:"Pipeline, customers, quotes" },
              { id:"reports", label:"Reports & Analytics", icon:"pie", sub:"Builder, scheduled runs" },
              { id:"settings-root", label:"Settings", icon:"gear", sub:"Roles, integrations, audit" },
            ].map(l=>(
              <div key={l.id} className="nav-item" style={{padding:"10px 12px",margin:"2px 0"}} onClick={()=>onNav(l.id)}>
                <Icon name={l.icon} className="ico"/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600}}>{l.label}</div>
                  <div className="muted tiny">{l.sub}</div>
                </div>
                <Icon name="chev-r" size={13} className="muted"/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function CashflowChart({ data }){
  const w = 720, h = 240, pad = { l: 40, r: 16, t: 16, b: 28 };
  const max = Math.max(...data.inflow, ...data.outflow) * 1.1;
  const xs = data.labels.map((_,i)=> pad.l + i * ((w - pad.l - pad.r) / (data.labels.length - 1)));
  const y = (v) => h - pad.b - (v/max) * (h - pad.t - pad.b);
  const line = (arr) => arr.map((v,i)=> (i?"L":"M") + xs[i] + "," + y(v)).join(" ");
  const area = (arr) => line(arr) + ` L ${xs[xs.length-1]},${h-pad.b} L ${xs[0]},${h-pad.b} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(max*t));
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F1B2D" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#0F1B2D" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {ticks.map((t,i)=>{
          const yy = y(t);
          return (
            <g key={i}>
              <line x1={pad.l} x2={w-pad.r} y1={yy} y2={yy} stroke="#EEF0F3"/>
              <text x={pad.l-8} y={yy+3} fontSize="10" fill="#98A2B3" textAnchor="end">{t}</text>
            </g>
          );
        })}
        <path d={area(data.inflow)} fill="url(#g1)"/>
        <path d={line(data.outflow)} fill="none" stroke="#98A2B3" strokeWidth="1.8" strokeDasharray="4 3"/>
        <path d={line(data.inflow)} fill="none" stroke="#0F1B2D" strokeWidth="2"/>
        {data.inflow.map((v,i)=>(<circle key={i} cx={xs[i]} cy={y(v)} r="3" fill="#0F1B2D"/>))}
        {data.labels.map((l,i)=>(<text key={i} x={xs[i]} y={h-8} fontSize="11" fill="#98A2B3" textAnchor="middle">{l}</text>))}
      </svg>
    </div>
  );
}

function OrdersBar(){
  const stages = [
    { name:"Open", count: 184, val: 42000000, color:"#0F1B2D" },
    { name:"In Fulfillment", count: 96, val: 28400000, color:"#2D4A7C" },
    { name:"Shipped", count: 53, val: 19200000, color:"#6B7A94" },
    { name:"Invoiced", count: 312, val: 118400000, color:"#98A2B3" },
  ];
  const max = Math.max(...stages.map(s=>s.val));
  return (
    <div>
      {stages.map((s,i)=>(
        <div key={i} style={{marginBottom:14}}>
          <div className="row between" style={{marginBottom:6}}>
            <div style={{fontSize:13,fontWeight:550}}>{s.name} <span className="muted tiny">· {s.count} orders</span></div>
            <div className="num" style={{fontSize:13,fontWeight:600}}>{window.MOCK.fmtINR(s.val)}</div>
          </div>
          <div style={{height:8,background:"var(--bg-muted)",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:(s.val/max*100)+"%",background:s.color,borderRadius:4}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

window.Dashboard = Dashboard;
