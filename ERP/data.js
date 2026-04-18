// Mock data for Comprint ERP
const fmtINR = (n) => {
  if (n === null || n === undefined) return "—";
  const abs = Math.abs(n);
  let s;
  if (abs >= 1e7) s = "₹" + (n / 1e7).toFixed(2) + " Cr";
  else if (abs >= 1e5) s = "₹" + (n / 1e5).toFixed(2) + " L";
  else if (abs >= 1e3) s = "₹" + (n / 1e3).toFixed(1) + "k";
  else s = "₹" + n;
  return s;
};
const fmtINRFull = (n) => "₹" + new Intl.NumberFormat("en-IN").format(n);

const WORKSPACES = [
  { id: "acme", name: "Acme Industries Pvt Ltd", role: "Administrator", members: 412, letter: "A" },
  { id: "bharat", name: "Bharat Logistics Group", role: "Finance Lead", members: 186, letter: "B" },
  { id: "meridian", name: "Meridian Retail Co.", role: "Operations", members: 94, letter: "M" },
];

const KPIS = [
  { label: "Revenue (MTD)", value: "₹14.82 Cr", delta: "+8.4%", dir: "up", sub: "vs last month" },
  { label: "Accounts Receivable", value: "₹6.32 Cr", delta: "12 overdue", dir: "down", sub: "43 open invoices" },
  { label: "Accounts Payable", value: "₹3.91 Cr", delta: "−2.1%", dir: "up", sub: "due this week" },
  { label: "Inventory Value", value: "₹18.47 Cr", delta: "+1.8%", dir: "up", sub: "across 6 warehouses" },
  { label: "Headcount", value: "1,284", delta: "+12", dir: "up", sub: "open reqs: 23" },
];

const CASHFLOW = {
  labels: ["Nov","Dec","Jan","Feb","Mar","Apr"],
  inflow: [820, 910, 1020, 1140, 1080, 1320],   // in lakhs
  outflow:[640, 720, 780, 820, 910, 970],
};

const ALERTS = [
  { type: "err", title: "12 invoices past due", sub: "₹48.2L combined — oldest 62 days", time: "2m ago" },
  { type: "warn", title: "Low stock: SKU-2241 (Hydraulic Seals)", sub: "Mumbai DC — 18 units, reorder at 50", time: "14m ago" },
  { type: "warn", title: "PO-10482 awaiting approval", sub: "₹6,42,000 · Vendor: Tata Steel Ltd", time: "1h ago" },
  { type: "info", title: "Q4 close checklist updated", sub: "3 new items assigned to Finance", time: "3h ago" },
  { type: "err", title: "GST filing reminder", sub: "GSTR-3B due in 2 days", time: "5h ago" },
];

const STOCK = [
  { sku: "SKU-1023", name: "Industrial Ball Bearing 6205-2RS", wh: "Mumbai DC", qty: 1284, reorder: 500, uom: "pcs", value: 642000, status: "in" },
  { sku: "SKU-1188", name: "Hydraulic Cylinder — 50mm Bore", wh: "Pune Plant", qty: 84, reorder: 120, uom: "pcs", value: 1344000, status: "low" },
  { sku: "SKU-2241", name: "Hydraulic Seal Kit (Std)", wh: "Mumbai DC", qty: 18, reorder: 50, uom: "kit", value: 43200, status: "crit" },
  { sku: "SKU-3310", name: "Stainless Fastener M8×40 Pack", wh: "Chennai Hub", qty: 4820, reorder: 1000, uom: "pack", value: 482000, status: "in" },
  { sku: "SKU-4102", name: "Copper Bus Bar 30×10", wh: "Bengaluru WH", qty: 612, reorder: 200, uom: "m", value: 918000, status: "in" },
  { sku: "SKU-4480", name: "Servo Motor 400W", wh: "Pune Plant", qty: 0, reorder: 25, uom: "pcs", value: 0, status: "out" },
  { sku: "SKU-5021", name: "PLC Module — 16 I/O", wh: "Chennai Hub", qty: 142, reorder: 60, uom: "pcs", value: 2130000, status: "in" },
  { sku: "SKU-5519", name: "Control Panel Enclosure 600×800", wh: "Mumbai DC", qty: 42, reorder: 50, uom: "pcs", value: 504000, status: "low" },
  { sku: "SKU-6612", name: "VFD Drive — 7.5kW", wh: "Bengaluru WH", qty: 28, reorder: 20, uom: "pcs", value: 1260000, status: "in" },
  { sku: "SKU-7080", name: "Industrial Conveyor Belt — 800mm", wh: "Pune Plant", qty: 186, reorder: 80, uom: "m", value: 558000, status: "in" },
  { sku: "SKU-7742", name: "SCADA License (annual)", wh: "HQ Vault", qty: 6, reorder: 10, uom: "lic", value: 1800000, status: "low" },
  { sku: "SKU-8821", name: "Lubricant Grease — 5kg Drum", wh: "Chennai Hub", qty: 310, reorder: 150, uom: "drum", value: 186000, status: "in" },
];

const WAREHOUSES = ["All warehouses","Mumbai DC","Pune Plant","Chennai Hub","Bengaluru WH","Delhi WH","HQ Vault"];

const PURCHASE_ORDERS = [
  { id:"PO-10482", vendor:"Tata Steel Ltd", items:14, amount:642000, status:"Pending approval", badge:"warn", date:"Apr 16, 2026" },
  { id:"PO-10481", vendor:"Bosch Rexroth India", items:3, amount:1344000, status:"Approved", badge:"ok", date:"Apr 15, 2026" },
  { id:"PO-10478", vendor:"Siemens India", items:8, amount:2480000, status:"In transit", badge:"info", date:"Apr 14, 2026" },
  { id:"PO-10472", vendor:"Larsen & Toubro", items:21, amount:918000, status:"Received", badge:"ok", date:"Apr 12, 2026" },
  { id:"PO-10469", vendor:"Havells India", items:6, amount:218000, status:"Draft", badge:"neutral", date:"Apr 11, 2026" },
  { id:"PO-10465", vendor:"Schneider Electric", items:12, amount:1620000, status:"Rejected", badge:"err", date:"Apr 10, 2026" },
];

const SUPPLIER = {
  id:"SUP-0042", name:"Bosch Rexroth India Pvt Ltd",
  address:"Plot 48, MIDC Industrial Area, Chinchwad, Pune 411019",
  gst:"27AAACB5432E1ZK", pan:"AAACB5432E",
  contact:"Rohan Mehta · rohan.mehta@bosch-rexroth.in · +91 98765 43210",
  rating:"A", onTime:94, leadTime:"12 days avg",
  ytdSpend: 4820000, openPos: 2, paymentTerms:"Net 45", currency:"INR",
};

const PIPELINE = {
  Lead: [
    { id:"D-2018", name:"Reliance Industries", val: 4800000, contact:"S. Ambani", daysIn: 2, owner:"PR" },
    { id:"D-2017", name:"Mahindra & Mahindra", val: 1820000, contact:"K. Pillai", daysIn: 5, owner:"AK" },
  ],
  Qualified: [
    { id:"D-2011", name:"Godrej Consumer", val: 3200000, contact:"A. Iyer", daysIn: 8, owner:"PR" },
    { id:"D-2009", name:"Wipro Infrastructure", val: 2450000, contact:"N. Rao", daysIn: 12, owner:"SM" },
    { id:"D-2006", name:"Asian Paints", val: 980000, contact:"R. Gupta", daysIn: 4, owner:"AK" },
  ],
  Proposal: [
    { id:"D-1998", name:"Infosys BPM", val: 6200000, contact:"M. Nair", daysIn: 14, owner:"PR" },
    { id:"D-1994", name:"ITC Hotels Division", val: 1150000, contact:"D. Shah", daysIn: 6, owner:"SM" },
  ],
  Negotiation: [
    { id:"D-1982", name:"Tata Power Co.", val: 8400000, contact:"V. Kulkarni", daysIn: 18, owner:"PR" },
    { id:"D-1978", name:"HDFC Bank (Facilities)", val: 2700000, contact:"S. Reddy", daysIn: 9, owner:"AK" },
  ],
  Won: [
    { id:"D-1955", name:"Larsen & Toubro", val: 5120000, contact:"P. Chawla", daysIn: 22, owner:"PR" },
    { id:"D-1949", name:"Bharat Petroleum", val: 3860000, contact:"H. Singh", daysIn: 26, owner:"SM" },
  ],
};

const CUSTOMER = {
  id:"CUST-0182", name:"Infosys BPM Limited",
  industry:"IT Services · Enterprise", city:"Bengaluru, KA",
  website:"infosysbpm.com", since:"Mar 2021",
  owner:"Priya Ranganathan", phone:"+91 80 2852 0261", email:"procurement@infosysbpm.com",
  healthScore: 82, ltv: 24800000, openAR: 620000, openDeals: 2, lastInteraction:"Apr 14, 2026"
};

const CUSTOMER_ACTIVITY = [
  { t:"Call", who:"Priya Ranganathan", note:"Discovery call — AMC renewal scope clarified. Decision maker confirmed.", when:"Apr 14" },
  { t:"Email", who:"Priya Ranganathan", note:"Sent revised proposal v2 with updated SLA addendum.", when:"Apr 11" },
  { t:"Meeting", who:"Arun Kashyap", note:"On-site walkthrough of Bengaluru campus integration points.", when:"Apr 7" },
  { t:"Quote", who:"System", note:"Quote Q-4481 generated — ₹62,00,000 (valid 30 days).", when:"Apr 4" },
];

const QUOTE = {
  id:"Q-4481", customer:"Infosys BPM Limited", validTill:"May 4, 2026",
  lines:[
    { sku:"SKU-5021", name:"PLC Module — 16 I/O", qty: 40, rate: 15000, tax: 18 },
    { sku:"SKU-6612", name:"VFD Drive — 7.5kW", qty: 8, rate: 45000, tax: 18 },
    { sku:"SKU-5519", name:"Control Panel Enclosure 600×800", qty: 12, rate: 12000, tax: 18 },
    { sku:"SRV-INST", name:"On-site installation & commissioning", qty: 1, rate: 420000, tax: 18 },
  ]
};

const REPORTS = [
  { name:"Monthly Revenue by Region", owner:"Finance", freq:"Monthly · 1st · 07:00", lastRun:"Apr 1, 2026", next:"May 1, 2026", format:"PDF, XLSX", status:"Active" },
  { name:"AR Aging — Weekly Digest", owner:"Finance", freq:"Weekly · Monday · 08:30", lastRun:"Apr 13, 2026", next:"Apr 20, 2026", format:"XLSX", status:"Active" },
  { name:"Inventory Turnover by Warehouse", owner:"Supply Chain", freq:"Bi-weekly · Wed", lastRun:"Apr 8, 2026", next:"Apr 22, 2026", format:"PDF", status:"Active" },
  { name:"Sales Pipeline Snapshot", owner:"Sales Ops", freq:"Daily · 06:00", lastRun:"Apr 17, 2026", next:"Apr 18, 2026", format:"PDF", status:"Paused" },
  { name:"Vendor Performance Scorecard", owner:"Procurement", freq:"Quarterly", lastRun:"Jan 1, 2026", next:"Jul 1, 2026", format:"PDF, XLSX", status:"Active" },
];

const ROLES = ["Admin","Finance Lead","Sales Manager","Warehouse Ops","Analyst","Auditor (Read-only)"];
const PERM_MODULES = [
  { name:"Dashboard", perms:["Admin","Finance Lead","Sales Manager","Warehouse Ops","Analyst","Auditor (Read-only)"] },
  { name:"Inventory", perms:["Admin","Warehouse Ops","Analyst:partial","Auditor (Read-only):partial"] },
  { name:"Purchase Orders", perms:["Admin","Finance Lead","Warehouse Ops:partial"] },
  { name:"Sales & CRM", perms:["Admin","Sales Manager","Analyst:partial"] },
  { name:"Quotes & Orders", perms:["Admin","Sales Manager","Finance Lead:partial"] },
  { name:"Invoicing & AR", perms:["Admin","Finance Lead"] },
  { name:"Reports", perms:["Admin","Finance Lead","Sales Manager","Analyst","Auditor (Read-only):partial"] },
  { name:"User Management", perms:["Admin"] },
  { name:"Integrations", perms:["Admin"] },
  { name:"Audit Log", perms:["Admin","Auditor (Read-only)"] },
];

const AUDIT_LOG = [
  { who:"Anjali Kapoor", action:"Approved PO-10481", target:"₹13,44,000 · Bosch Rexroth", when:"Apr 17, 14:22", ip:"10.8.2.41" },
  { who:"System", action:"Scheduled report ran", target:"Sales Pipeline Snapshot", when:"Apr 17, 06:00", ip:"—" },
  { who:"Rohan Mehta", action:"Updated customer", target:"CUST-0182 · Infosys BPM", when:"Apr 17, 11:40", ip:"10.8.2.18" },
  { who:"Priya Ranganathan", action:"Created quote", target:"Q-4481 · ₹62,00,000", when:"Apr 16, 17:05", ip:"10.8.2.22" },
  { who:"Suresh Menon", action:"Modified role permissions", target:"Sales Manager → Invoicing (deny)", when:"Apr 15, 10:12", ip:"10.8.2.04" },
  { who:"Kiran Joshi", action:"Exported report", target:"AR Aging — Mar 2026", when:"Apr 14, 09:33", ip:"10.8.2.91" },
];

const INTEGRATIONS = [
  { name:"Tally Prime", cat:"Accounting", status:"Connected", note:"Syncs every 15 min · last at 14:38", letter:"T" },
  { name:"SAP Business One", cat:"ERP Bridge", status:"Connected", note:"Read-only · master data mirror", letter:"S" },
  { name:"Razorpay", cat:"Payments", status:"Connected", note:"12 transactions today", letter:"R" },
  { name:"Salesforce", cat:"CRM", status:"Disconnected", note:"Re-authenticate to resume sync", letter:"S" },
  { name:"Google Workspace", cat:"Identity / SSO", status:"Connected", note:"SAML · 412 users provisioned", letter:"G" },
  { name:"Slack", cat:"Notifications", status:"Connected", note:"#erp-alerts channel", letter:"S" },
  { name:"Shiprocket", cat:"Logistics", status:"Error", note:"Token expired · reconnect needed", letter:"S" },
  { name:"ClearTax GST", cat:"Tax & Compliance", status:"Connected", note:"GSTR-3B filed for Mar 2026", letter:"C" },
];

window.MOCK = { fmtINR, fmtINRFull, WORKSPACES, KPIS, CASHFLOW, ALERTS, STOCK, WAREHOUSES, PURCHASE_ORDERS, SUPPLIER, PIPELINE, CUSTOMER, CUSTOMER_ACTIVITY, QUOTE, REPORTS, ROLES, PERM_MODULES, AUDIT_LOG, INTEGRATIONS };
