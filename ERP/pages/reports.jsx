// Reports & Analytics
function ReportsView({ tab, setTab }){
  const tabs = [
    { id:"builder", label:"Report Builder" },
    { id:"scheduled", label:"Scheduled Reports" },
    { id:"library", label:"Library" },
  ];
  return (
    <>
      <Breadcrumb items={[{label:"Home"},{label:"Analytics"},{label: tab==="builder"?"Report Builder": tab==="scheduled"?"Scheduled":"Library"}]}/>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <div className="page-sub">{tab==="builder"?"Drag fields to build a new report · Revenue · YTD":tab==="scheduled"?"Manage automated report schedules":"All saved reports across the organization"}</div>
        </div>
        <div className="row">
          {tab==="builder" && <><button className="btn"><Icon name="download" size={13}/> Export</button><button className="btn btn-primary"><Icon name="check" size={13}/> Save report</button></>}
          {tab==="scheduled" && <><button className="btn"><Icon name="filter" size={13}/> Filter</button><button className="btn btn-primary"><Icon name="plus" size={13}/> New schedule</button></>}
        </div>
      </div>
      <div className="tabs">
        {tabs.map(t=>(<div key={t.id} className={"tab "+(tab===t.id?"active":"")} onClick={()=>setTab(t.id)}>{t.label}</div>))}
      </div>
      {tab==="builder" && <ReportBuilder/>}
      {tab==="scheduled" && <ScheduledReports/>}
      {tab==="library" && <ReportLibrary/>}
    </>
  );
}

const AVAIL_FIELDS = [
  { id:"revenue", label:"Revenue", cat:"Measure", type:"num" },
  { id:"cogs", label:"COGS", cat:"Measure", type:"num" },
  { id:"margin", label:"Gross margin %", cat:"Measure", type:"pct" },
  { id:"orders", label:"Order count", cat:"Measure", type:"num" },
  { id:"region", label:"Region", cat:"Dimension", type:"dim" },
  { id:"product", label:"Product line", cat:"Dimension", type:"dim" },
  { id:"customer", label:"Customer segment", cat:"Dimension", type:"dim" },
  { id:"month", label:"Month", cat:"Time", type:"time" },
  { id:"quarter", label:"Quarter", cat:"Time", type:"time" },
  { id:"year", label:"Year", cat:"Time", type:"time" },
];

function ReportBuilder(){
  const [rows, setRows] = useState([AVAIL_FIELDS[7]]);           // Month
  const [cols, setCols] = useState([AVAIL_FIELDS[4]]);           // Region
  const [measures, setMeasures] = useState([AVAIL_FIELDS[0]]);   // Revenue
  const [chart, setChart] = useState("bar");
  const [dragField, setDragField] = useState(null);
  const [overZone, setOverZone] = useState(null);

  const addTo = (zone, f) => {
    const setter = zone==="rows"?setRows:zone==="cols"?setCols:setMeasures;
    const arr = zone==="rows"?rows:zone==="cols"?cols:measures;
    if (arr.find(x=>x.id===f.id)) return;
    setter([...arr, f]);
  };
  const removeFrom = (zone, id) => {
    const setter = zone==="rows"?setRows:zone==="cols"?setCols:setMeasures;
    const arr = zone==="rows"?rows:zone==="cols"?cols:measures;
    setter(arr.filter(x=>x.id!==id));
  };

  const dropped = new Set([...rows, ...cols, ...measures].map(f=>f.id));

  const DropZone = ({ zone, list, label }) => (
    <div className={"drop-zone "+(overZone===zone?"over":"")}
      onDragOver={e=>{e.preventDefault(); setOverZone(zone);}}
      onDragLeave={()=>setOverZone(null)}
      onDrop={()=>{ if(dragField) addTo(zone, dragField); setOverZone(null); setDragField(null); }}>
      <div className="muted tiny" style={{fontWeight:550,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>{label}</div>
      {list.length===0 ? <div className="muted tiny" style={{padding:"8px 0"}}>Drop fields here</div> :
        list.map(f=>(
          <div key={f.id} className="field-chip dropped" style={{cursor:"default"}}>
            <Icon name={f.type==="num"?"chart":f.type==="time"?"calendar":"grid"} size={13}/>
            <span style={{flex:1}}>{f.label}</span>
            <button className="icon-btn" style={{width:22,height:22}} onClick={()=>removeFrom(zone, f.id)}><Icon name="x" size={11}/></button>
          </div>
        ))
      }
    </div>
  );

  return (
    <div className="rb-grid">
      <div className="rb-col">
        <div className="rb-head">Available fields</div>
        <div className="rb-body">
          <div className="search-field" style={{marginBottom:12,width:"100%"}}>
            <Icon name="search" size={13}/>
            <input placeholder="Search fields…"/>
          </div>
          {["Measure","Dimension","Time"].map(cat=>(
            <div key={cat} style={{marginBottom:12}}>
              <div className="muted tiny" style={{fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>{cat}</div>
              {AVAIL_FIELDS.filter(f=>f.cat===cat).map(f=>(
                <div key={f.id} className="field-chip" draggable
                  onDragStart={()=>setDragField(f)}
                  onDragEnd={()=>setDragField(null)}
                  style={{opacity: dropped.has(f.id)?0.4:1}}>
                  <Icon name={f.type==="num"?"chart":f.type==="time"?"calendar":"grid"} size={13} className="muted"/>
                  <span style={{flex:1}}>{f.label}</span>
                  {dropped.has(f.id) && <Icon name="check" size={12} className="muted"/>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="rb-col">
        <div className="rb-head row between">
          <span>Preview</span>
          <div className="seg">
            <button className={chart==="bar"?"on":""} onClick={()=>setChart("bar")}>Bar</button>
            <button className={chart==="line"?"on":""} onClick={()=>setChart("line")}>Line</button>
            <button className={chart==="table"?"on":""} onClick={()=>setChart("table")}>Table</button>
          </div>
        </div>
        <div className="rb-body" style={{padding:20}}>
          <div className="row between" style={{marginBottom:10}}>
            <div style={{fontWeight:600,fontSize:14}}>Revenue by {cols[0]?.label||"—"} over {rows[0]?.label||"—"}</div>
            <div className="muted tiny">FY 2026 · ₹ lakhs</div>
          </div>
          <PreviewChart kind={chart} rows={rows} cols={cols} measures={measures}/>
          {(rows.length===0 || measures.length===0) && (
            <div className="state" style={{padding:"28px 0"}}>
              <div className="state-ico"><Icon name="pie" size={20}/></div>
              <h3>Drop at least one dimension and one measure</h3>
              <p>Drag fields from the left panel into Rows, Columns, or Measures to build your report.</p>
            </div>
          )}
        </div>
      </div>

      <div className="rb-col">
        <div className="rb-head">Configuration</div>
        <div className="rb-body">
          <DropZone zone="rows" list={rows} label="Rows"/>
          <DropZone zone="cols" list={cols} label="Columns"/>
          <DropZone zone="measures" list={measures} label="Measures"/>
          <div className="divider" style={{margin:"8px 0 14px"}}/>
          <div className="field">
            <label className="field-label">Date range</label>
            <select className="select"><option>Fiscal Year 2026</option><option>Last 12 months</option><option>Custom…</option></select>
          </div>
          <div className="field">
            <label className="field-label">Filters</label>
            <div className="row" style={{flexWrap:"wrap",gap:6}}>
              <span className="filter-chip on">Region ≠ Export</span>
              <span className="filter-chip">+ Add filter</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewChart({ kind, rows, cols, measures }){
  if (rows.length===0 || measures.length===0) return null;
  // Fake data: 6 months x 4 regions
  const months = ["Nov","Dec","Jan","Feb","Mar","Apr"];
  const regions = ["North","West","South","East"];
  const data = months.map((_,i)=> regions.map((_,j)=> 40 + (i*10) + (j*15) + Math.round(Math.sin(i+j)*20)));
  const colors = ["#0F1B2D","#2D4A7C","#6B7A94","#98A2B3"];
  const w = 600, h = 260, pad = { l:36, r:16, t:10, b:26 };
  const max = Math.max(...data.flat()) * 1.15;

  if (kind === "table"){
    return (
      <table className="tbl" style={{border:"1px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
        <thead><tr><th>Month</th>{regions.map(r=><th key={r} className="right">{r}</th>)}<th className="right" style={{fontWeight:650,color:"var(--text)"}}>Total</th></tr></thead>
        <tbody>
          {months.map((m,i)=>(
            <tr key={m}>
              <td style={{fontWeight:550}}>{m}</td>
              {regions.map((_,j)=><td key={j} className="right num">{data[i][j]}</td>)}
              <td className="right num" style={{fontWeight:650}}>{data[i].reduce((s,x)=>s+x,0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (kind === "line"){
    const y = v => h - pad.b - (v/max)*(h-pad.t-pad.b);
    const xs = months.map((_,i)=> pad.l + i * ((w-pad.l-pad.r)/(months.length-1)));
    return (
      <div className="chart-wrap" style={{height:300}}>
        <svg viewBox={`0 0 ${w} ${h}`}>
          {[0,.25,.5,.75,1].map((t,i)=>{const yy=y(max*t);return <line key={i} x1={pad.l} x2={w-pad.r} y1={yy} y2={yy} stroke="#EEF0F3"/>;})}
          {regions.map((r,j)=>{
            const pts = months.map((_,i)=>`${xs[i]},${y(data[i][j])}`).join(" L");
            return <path key={r} d={"M"+pts} fill="none" stroke={colors[j]} strokeWidth="2"/>;
          })}
          {months.map((m,i)=><text key={m} x={xs[i]} y={h-8} fontSize="11" fill="#98A2B3" textAnchor="middle">{m}</text>)}
        </svg>
        <div className="legend" style={{marginTop:8}}>{regions.map((r,j)=>(<span key={r} className="tiny"><span className="dot" style={{background:colors[j]}}/>{r}</span>))}</div>
      </div>
    );
  }
  // bar (grouped)
  const band = (w-pad.l-pad.r)/months.length;
  const barW = (band - 10) / regions.length;
  const y = v => h - pad.b - (v/max)*(h-pad.t-pad.b);
  return (
    <div className="chart-wrap" style={{height:300}}>
      <svg viewBox={`0 0 ${w} ${h}`}>
        {[0,.25,.5,.75,1].map((t,i)=>{const yy=y(max*t);return <line key={i} x1={pad.l} x2={w-pad.r} y1={yy} y2={yy} stroke="#EEF0F3"/>;})}
        {months.map((m,i)=>(
          <g key={m}>
            {regions.map((r,j)=>{
              const v = data[i][j];
              const x = pad.l + i*band + 5 + j*barW;
              return <rect key={r} x={x} y={y(v)} width={barW-2} height={h-pad.b-y(v)} fill={colors[j]} rx="2"/>;
            })}
            <text x={pad.l + i*band + band/2} y={h-8} fontSize="11" fill="#98A2B3" textAnchor="middle">{m}</text>
          </g>
        ))}
      </svg>
      <div className="legend" style={{marginTop:8}}>{regions.map((r,j)=>(<span key={r} className="tiny"><span className="dot" style={{background:colors[j]}}/>{r}</span>))}</div>
    </div>
  );
}

function ScheduledReports(){
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ const t = setTimeout(()=>setLoading(false), 700); return ()=>clearTimeout(t); },[]);
  if (loading) return (
    <div className="table-wrap">
      <div style={{padding:14}}>
        {[...Array(5)].map((_,i)=>(
          <div key={i} className="row" style={{gap:12,padding:"12px 0",borderBottom: i<4?"1px solid var(--border)":"none"}}>
            <div className="skeleton" style={{width:22,height:22,borderRadius:6}}/>
            <div className="skeleton" style={{height:14,flex:2}}/>
            <div className="skeleton" style={{height:14,flex:1}}/>
            <div className="skeleton" style={{height:14,width:120}}/>
            <div className="skeleton" style={{height:14,width:100}}/>
            <div className="skeleton" style={{height:22,width:70,borderRadius:11}}/>
          </div>
        ))}
      </div>
    </div>
  );
  const R = window.MOCK.REPORTS;
  return (
    <div className="table-wrap">
      <div className="table-toolbar">
        <div className="search-field"><Icon name="search" size={14}/><input placeholder="Search scheduled reports…"/></div>
        <button className="filter-chip on">All</button>
        <button className="filter-chip">Active</button>
        <button className="filter-chip">Paused</button>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th className="chk"><span className="cb"/></th>
            <th>Report</th>
            <th>Owner</th>
            <th>Schedule</th>
            <th>Last run</th>
            <th>Next run</th>
            <th>Format</th>
            <th>Status</th>
            <th style={{width:40}}></th>
          </tr>
        </thead>
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
  );
}

function ReportLibrary(){
  // Error state example
  return (
    <div className="card">
      <div className="state" style={{padding:"64px 24px"}}>
        <div className="state-ico" style={{background:"var(--err-bg)",color:"var(--err)"}}><Icon name="warn" size={20}/></div>
        <h3>Unable to load report library</h3>
        <p>We couldn't connect to the analytics service. This is usually temporary — please try again in a moment.</p>
        <div className="row" style={{justifyContent:"center",gap:8}}>
          <button className="btn">Contact support</button>
          <button className="btn btn-primary">Retry</button>
        </div>
        <div className="muted tiny" style={{marginTop:14}}>Error code: <span className="mono">ANALYTICS_503 · req_a7f81c</span></div>
      </div>
    </div>
  );
}

window.ReportsView = ReportsView;
