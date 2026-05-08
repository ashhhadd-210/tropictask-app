import React, { useState, useEffect, useCallback, createContext, useContext, useRef, useMemo } from 'react'
import { SEED_DATA } from './lib/seedData'
import { STAGES, getStage, ROLE_LABELS, ROLE_ICONS, WO_CATEGORIES, priBadge, priLabel, stageBadge, daysAgo } from './lib/constants'
import { isSupabaseConfigured, signIn as supabaseSignIn, signUp as supabaseSignUp, signOut as supabaseSignOut, getSession as getSupabaseSession, fetchProfile, fetchProfiles, fetchProperties, fetchAllUserProperties, fetchWorkOrders, fetchPayments, fetchComponents, fetchReviews, createProperty as supabaseCreateProperty, updateProperty as supabaseUpdateProperty, deleteProperty as supabaseDeleteProperty, createWorkOrder as supabaseCreateWorkOrder, createPayment as supabaseCreatePayment, updatePaymentStatus as supabaseUpdatePaymentStatus, updateWorkOrderStage as supabaseUpdateWorkOrderStage, updateProfile as supabaseUpdateProfile } from './lib/supabase'

/* ═══════════════════════════════════════════
   PERSISTENT STORAGE
   ═══════════════════════════════════════════ */
const SK = 'tt-app-v4';
function loadStore() {
  try { const s = localStorage.getItem(SK); return s ? JSON.parse(s) : null; } catch { return null; }
}
function saveStore(d) {
  try { localStorage.setItem(SK, JSON.stringify(d)); } catch {}
}

/* ═══════════════════════════════════════════
   SEED DATA (matches dev doc schema)
   ═══════════════════════════════════════════ */
const SEED = SEED_DATA;

/* ═══════════════════════════════════════════
   CONTEXT
   ═══════════════════════════════════════════ */
const Ctx = createContext();
const useApp = () => useContext(Ctx);

/* ═══════════════════════════════════════════
   WORK ORDER STAGE CONFIG (9-stage lifecycle)
   ═══════════════════════════════════════════ */


/* ═══════════════════════════════════════════
   DATA INTEGRITY HELPERS (Day 30)
   ═══════════════════════════════════════════ */
const initials = (name) => {
  if (!name || typeof name !== 'string') return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  return parts.slice(0,2).map(w => w[0]).join('').toUpperCase();
};
const firstName = (name) => {
  if (!name || typeof name !== 'string') return 'there';
  return name.trim().split(/\s+/)[0] || 'there';
};
// Normalize loaded data so missing arrays/fields can never crash a render
const sanitizeStore = (d) => {
  if (!d || typeof d !== 'object') return null;
  return {
    users: Array.isArray(d.users) ? d.users : [],
    properties: Array.isArray(d.properties) ? d.properties : [],
    workOrders: Array.isArray(d.workOrders) ? d.workOrders : [],
    payments: Array.isArray(d.payments) ? d.payments : [],
    components: Array.isArray(d.components) ? d.components : [],
    reviews: Array.isArray(d.reviews) ? d.reviews : [],
    invites: Array.isArray(d.invites) ? d.invites : [],
    expenses: Array.isArray(d.expenses) ? d.expenses : [],
    _nextId: d._nextId && typeof d._nextId === 'object'
      ? { u:8, p:6, wo:9, pay:7, r:3, c:4, inv:1, exp:6, ...d._nextId }
      : { u:8, p:6, wo:9, pay:7, r:3, c:4, inv:1, exp:6 },
  };
};

/* ═══════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════ */
const I = (d,s=16,sw=1.75) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const icons = {
  dash: I(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>),
  prop: I(<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>),
  wo: I(<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>),
  cal: I(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>),
  pay: I(<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"/></>),
  users: I(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>),
  user: I(<><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>),
  report: I(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>),
  fin: I(<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>),
  plus: I(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,14,2.5),
  search: I(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,15),
  bell: I(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>),
  logout: I(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>),
  chev: I(<polyline points="9 18 15 12 9 6"/>,16),
  star: I(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>),
  acct: I(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>),
  mail: I(<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></>),
  doc: I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>),
  receipt: I(<><path d="M3 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="17" y2="13"/><line x1="7" y1="17" x2="13" y2="17"/></>),
  upload: I(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>),
  check: I(<polyline points="20 6 9 17 4 12"/>,16,2.5),
  menu: I(<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,20,2),
  x: I(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,14,2),
};

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
const Badge = ({c,children}) => <span className={`badge ${c}`}>{children}</span>;

/* ═══════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════ */
function Toast({msg,onDone}) { useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[onDone]); return <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:9999}}><div className="badge" style={{background:"var(--black)",color:"white",padding:"11px 22px",borderRadius:100,fontSize:13,fontWeight:500,border:"none",animation:"fadeUp .3s ease both"}}>{msg}</div></div>; }

function Modal({title,sub,onClose,wide,children}) {
  return <div className="modal-shell" onClick={onClose}>
    <div className={`modal-card${wide?" wide":""}`} onClick={e=>e.stopPropagation()}>
      <div className="modal-head">
        <div><div className="panel-title" dangerouslySetInnerHTML={{__html:title}}/>{sub&&<div style={{fontSize:12,color:"var(--text-muted)",marginTop:3}}>{sub}</div>}</div>
        <button onClick={onClose} className="close-btn">{icons.x}</button>
      </div>
      <div className="modal-body">{children}</div>
    </div>
  </div>;
}

function SlidePanel({title,sub,onClose,children,size="lg"}) {
  // size: "lg" (default 720), "xl" (840), "md" (560)
  return <>
    <div className="slide-overlay-bg" onClick={onClose}/>
    <div className={`slide-panel slide-${size}`}>
      <div className="slide-head">
        <div style={{minWidth:0,flex:1}}><div className="panel-title" dangerouslySetInnerHTML={{__html:title}}/>{sub&&<div style={{fontSize:12,color:"var(--text-muted)",marginTop:3}}>{sub}</div>}</div>
        <button onClick={onClose} className="close-btn">{icons.x}</button>
      </div>
      <div className="slide-body">{children}</div>
    </div>
  </>;
}

function EmptyState({icon,text,sub}) { return <div className="empty-state"><div className="empty-icon">{icon}</div><div className="empty-text">{text}</div>{sub&&<div style={{fontSize:13,color:"var(--text-muted)",marginTop:4}}>{sub}</div>}</div>; }

function StatCard({label,value,color,icon,sub,onClick}) {
  return <div className="stat-card" onClick={onClick} style={onClick?{cursor:"pointer"}:undefined}><div><div className="stat-label">{label}</div><div className="stat-value" style={{color:color||"var(--black)"}}>{value}</div>{sub&&<div style={{fontSize:12,color:"var(--text-muted)",marginTop:4}}>{sub}</div>}</div>{icon&&<div className="stat-icon" style={{background:color?color+"18":"var(--forest-mist)"}}><span style={{fontSize:20}}>{icon}</span></div>}</div>;
}

function Field({label,children,sub}) { return <div className="field"><label className="field-label">{label}</label>{sub&&<div className="field-sub">{sub}</div>}{children}</div>; }

/* ═══════════════════════════════════════════
   APP SHELL — Topbar + Sidenav + Role Bar
   ═══════════════════════════════════════════ */
function AppShell({page,children}) {
  const {user,activeRole,setActiveRole,navigate,data,logout} = useApp();
  const [searchQ, setSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Close mobile nav on page change
  useEffect(()=>{setMobileNavOpen(false);},[page]);
  if(!user) return null;
  const navTo=(p,params)=>{setMobileNavOpen(false);navigate(p,params);};
  const userInitials = initials(user.name);
  const openWOs = data.workOrders.filter(w=>w.stage<9).length;
  const propCount = data.properties.filter(p=> activeRole==="owner"?p.owner_id===user.id : activeRole==="tenant"?data.users.find(u=>u.id===user.id)?.property_id===p.id : p.manager_id===user.id).length;

  // Search logic
  const sq = searchQ.toLowerCase().trim();
  const searchResults = sq.length>=2 ? {
    properties: data.properties.filter(p=>(p.address+p.city+p.type).toLowerCase().includes(sq)).slice(0,4),
    workOrders: data.workOrders.filter(w=>(w.title+(w.wo_number||'')+w.category).toLowerCase().includes(sq)).slice(0,4),
    people: data.users.filter(u=>(u.name+u.email+(u.trade||'')).toLowerCase().includes(sq)).slice(0,4),
  } : null;
  const hasResults = searchResults && (searchResults.properties.length||searchResults.workOrders.length||searchResults.people.length);

  // Notifications
  const notifications = [
    ...data.workOrders.filter(w=>w.priority==="urgent"&&w.stage<9).map(w=>({id:"u-"+w.id,icon:"🔴",text:`Urgent: ${w.title}`,sub:w.wo_number||"Work Order",page:"workorders",params:{detail:w.id}})),
    ...data.payments.filter(p=>p.status==="overdue").map(p=>({id:"o-"+p.id,icon:"⚠️",text:`Overdue payment: $${p.amount}`,sub:data.properties.find(pr=>pr.id===p.property_id)?.address||"Payment",page:"payments",params:{detail:p.id}})),
    ...(data.expenses||[]).filter(e=>e.status==="pending").slice(0,3).map(e=>({id:"e-"+e.id,icon:"💼",text:`Pending expense: $${e.amount}`,sub:e.description.slice(0,40),page:"expenses",params:{status:"pending"}})),
    ...data.workOrders.filter(w=>!w.contractor_id&&w.stage<9).slice(0,3).map(w=>({id:"a-"+w.id,icon:"👷",text:`Unassigned: ${w.title}`,sub:"Needs contractor",page:"workorders",params:{detail:w.id}})),
  ].slice(0,8);

  const pendingExpenses=(data.expenses||[]).filter(e=>e.status==="pending").length;
  const myContractorExpenses=(data.expenses||[]).filter(e=>e.contractor_id===user.id).length;
  const myOwnerExpenses=(()=>{const ids=data.properties.filter(p=>p.owner_id===user.id).map(p=>p.id);return (data.expenses||[]).filter(e=>ids.includes(e.property_id)).length;})();

  const NAV = {
    manager:[
      {g:"Overview",items:[{i:icons.dash,l:"Dashboard",p:"dashboard"},{i:icons.prop,l:"Properties",p:"properties",c:data.properties.filter(p=>p.manager_id===user.id).length},{i:icons.wo,l:"Work Orders",p:"workorders",c:openWOs,u:true},{i:icons.cal,l:"Calendar",p:"calendar"}]},
      {g:"Operations",items:[{i:icons.users,l:"Contractors",p:"contractors"},{i:icons.user,l:"Tenants",p:"tenants"},{i:icons.receipt,l:"Expenses",p:"expenses",c:pendingExpenses,u:!!pendingExpenses}]},
      {g:"Insights",items:[{i:icons.report,l:"Reports",p:"reports"},{i:icons.pay,l:"Financials",p:"financials"}]},
    ],
    owner:[
      {g:"Overview",items:[{i:icons.dash,l:"Dashboard",p:"dashboard"},{i:icons.prop,l:"My Properties",p:"properties",c:data.properties.filter(p=>p.owner_id===user.id).length},{i:icons.wo,l:"Work Orders",p:"workorders"},{i:icons.cal,l:"Calendar",p:"calendar"}]},
      {g:"Management",items:[{i:icons.users,l:"Contractors",p:"contractors"},{i:icons.user,l:"Tenants",p:"tenants"},{i:icons.receipt,l:"Expenses",p:"expenses",c:myOwnerExpenses},{i:icons.report,l:"Reports",p:"reports"},{i:icons.pay,l:"Financials",p:"financials"}]},
    ],
    contractor:[
      {g:"Work",items:[{i:icons.dash,l:"Dashboard",p:"dashboard"},{i:icons.wo,l:"Available Jobs",p:"workorders",c:data.workOrders.filter(w=>(!w.contractor_id||w.contractor_id===user.id)&&w.stage<9).length},{i:icons.cal,l:"Calendar",p:"calendar"}]},
      {g:"Business",items:[{i:icons.receipt,l:"My Expenses",p:"expenses",c:myContractorExpenses},{i:icons.report,l:"My Reviews",p:"reports"}]},
    ],
    tenant:[
      {g:"My Home",items:[{i:icons.dash,l:"Dashboard",p:"dashboard"},{i:icons.wo,l:"My Requests",p:"workorders",c:data.workOrders.filter(w=>w.submitted_by===user.id&&w.stage<9).length,u:true},{i:icons.cal,l:"Calendar",p:"calendar"}]},
      {g:"Info",items:[{i:icons.pay,l:"Payments",p:"payments"},{i:icons.doc,l:"Documents",p:"documents"}]},
    ],
  };
  const navGroups = NAV[activeRole] || NAV.manager;
  const roleLabels = {manager:"Property Manager",owner:"Property Owner",contractor:"Contractor",tenant:"Tenant"};
  const roleIcons = {manager:"🏢",owner:"🏠",contractor:"🔧",tenant:"🔑"};
  const hour = new Date().getHours();
  const greet = hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";

  return <>
    {/* TOPBAR */}
    <header className="topbar">
      <button className="mobile-menu-btn" onClick={()=>setMobileNavOpen(true)} aria-label="Open menu">{icons.menu}</button>
      <div className="topbar-logo" onClick={()=>navigate("dashboard")}><span className="logo-text">TropicTask</span></div>
      <div className="topbar-center"><div className="topbar-search-wrap" style={{position:"relative"}}><span className="ts-icon">{icons.search}</span><input placeholder="Search properties, work orders, contractors…" value={searchQ} onChange={e=>{setSearchQ(e.target.value);setSearchOpen(true);setNotifOpen(false);}} onFocus={()=>{if(sq.length>=2)setSearchOpen(true);}} onBlur={()=>setTimeout(()=>setSearchOpen(false),200)}/>
        {searchOpen&&searchResults&&<div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:6,background:"white",borderRadius:16,boxShadow:"0 12px 48px rgba(0,0,0,.18)",border:"1px solid rgba(0,83,87,.1)",maxHeight:360,overflowY:"auto",zIndex:999,animation:"fadeUp .2s ease both"}}>
          {!hasResults&&<div style={{padding:"20px 16px",textAlign:"center",color:"var(--text-muted)",fontSize:13}}>No results for "{searchQ}"</div>}
          {searchResults.properties.length>0&&<><div style={{padding:"10px 16px 4px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"var(--text-muted)"}}>Properties</div>{searchResults.properties.map(p=><div key={p.id} className="list-row" style={{padding:"10px 16px"}} onMouseDown={()=>{setSearchQ("");setSearchOpen(false);navigate("properties",{detail:p.id});}}><span style={{fontSize:16}}>🏠</span><div><div className="row-title" style={{fontSize:13}}>{p.address}</div><div className="row-sub">{p.city}, {p.state}</div></div></div>)}</>}
          {searchResults.workOrders.length>0&&<><div style={{padding:"10px 16px 4px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"var(--text-muted)"}}>Work Orders</div>{searchResults.workOrders.map(w=><div key={w.id} className="list-row" style={{padding:"10px 16px"}} onMouseDown={()=>{setSearchQ("");setSearchOpen(false);navigate("workorders",{detail:w.id});}}><span style={{fontSize:16}}>🔧</span><div><div className="row-title" style={{fontSize:13}}>{w.title}</div><div className="row-sub">{w.wo_number} · {w.category}</div></div></div>)}</>}
          {searchResults.people.length>0&&<><div style={{padding:"10px 16px 4px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"var(--text-muted)"}}>People</div>{searchResults.people.map(u=><div key={u.id} className="list-row" style={{padding:"10px 16px"}} onMouseDown={()=>{setSearchQ("");setSearchOpen(false);navigate(u.roles?.includes("contractor")?"contractors":"tenants",{detail:u.id});}}><span style={{fontSize:16}}>👤</span><div><div className="row-title" style={{fontSize:13}}>{u.name}</div><div className="row-sub">{u.email}</div></div></div>)}</>}
        </div>}
      </div></div>
      <div className="topbar-right">
        <div className="topbar-notif" style={{position:"relative"}} onClick={()=>{setNotifOpen(!notifOpen);setSearchOpen(false);}}>{icons.bell}{notifications.length>0&&<div className="notif-dot"/>}
          {notifOpen&&<div style={{position:"absolute",top:"100%",right:0,marginTop:8,width:320,background:"white",borderRadius:16,boxShadow:"0 12px 48px rgba(0,0,0,.18)",border:"1px solid rgba(0,83,87,.1)",maxHeight:380,overflowY:"auto",zIndex:999,animation:"fadeUp .2s ease both"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"14px 16px 10px",borderBottom:"1px solid rgba(0,83,87,.08)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:15,color:"var(--black)"}}>Notifications</div>
            {notifications.length===0&&<div style={{padding:"24px 16px",textAlign:"center",color:"var(--text-muted)",fontSize:13}}>All caught up!</div>}
            {notifications.map(n=><div key={n.id} className="list-row" style={{padding:"10px 16px",cursor:"pointer"}} onClick={()=>{setNotifOpen(false);navigate(n.page,n.params||{});}}><span style={{fontSize:16}}>{n.icon}</span><div style={{flex:1}}><div className="row-title" style={{fontSize:12}}>{n.text}</div><div className="row-sub">{n.sub}</div></div></div>)}
          </div>}
        </div>
        <div className="topbar-user" onClick={()=>navigate("account")}><div className="topbar-avatar">{userInitials}</div><span className="topbar-uname">{user.name}</span></div>
      </div>
    </header>

    {/* ROLE BAR */}
    <div className="role-bar">
      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
        {(user.roles||[]).length>1
          ? user.roles.map(r=>(<div key={r} className={`role-tab${activeRole===r?" active":""}`} onClick={()=>setActiveRole(r)}>{roleIcons[r]} {roleLabels[r]}</div>))
          : <div className="role-tab active">{roleIcons[activeRole]} {roleLabels[activeRole]}</div>
        }
      </div>
      <div className="role-bar-greet">{greet}, <em>{firstName(user.name)}</em></div>
    </div>

    {/* SIDENAV */}
    {mobileNavOpen&&<div className="sidenav-overlay" onClick={()=>setMobileNavOpen(false)}/>}
    <nav className={`sidenav${mobileNavOpen?" open":""}`}>
      <div className="nav-role-hdr"><div className="nav-role-lbl">{roleLabels[activeRole]}</div><div className="nav-role-sub">{activeRole==="manager"?user.company_name||user.name:activeRole==="contractor"?user.company_name||user.trade||user.name:activeRole==="tenant"?data.properties.find(p=>p.id===user.property_id)?.address||"My Home":user.name}</div></div>
      {navGroups.map(g=><div key={g.g}>
        <div className="nav-grp-lbl">{g.g}</div>
        {g.items.map(item=><div key={item.p} className={`nav-item${page===item.p?" active":""}`} onClick={()=>navTo(item.p)}>
          <span className="nav-icon">{item.i}</span>{item.l}
          {item.c>0&&<span className={`nav-count${item.u?" urgent":""}`}>{item.c}</span>}
        </div>)}
      </div>)}
      {(activeRole==="manager")&&<><div className="nav-divider"/><div className="nav-grp-lbl">Invites</div>
        <div className="nav-item" onClick={()=>navTo("invite",{type:"tenant"})}><span className="nav-icon">{icons.mail}</span>Invite Tenant</div>
        <div className="nav-item" onClick={()=>navTo("invite",{type:"owner"})}><span className="nav-icon">{icons.mail}</span>Invite Owner</div>
        <div className="nav-item" onClick={()=>navTo("invite",{type:"contractor"})}><span className="nav-icon">{icons.mail}</span>Invite Contractor</div>
      </>}
      <div className="nav-divider"/>
      <div className="nav-bottom">
        <div className="nav-item" onClick={()=>navTo("account")}><span className="nav-icon">{icons.acct}</span>Account</div>
        <div className="nav-item" style={{color:"var(--error)"}} onClick={logout}><span className="nav-icon">{icons.logout}</span>Sign out</div>
      </div>
    </nav>

    {/* MAIN */}
    <div className="app-layout"><main className="app-main" key={page}>{children}</main></div>
  </>;
}

/* ═══════════════════════════════════════════
   SIGN IN
   ═══════════════════════════════════════════ */
function SignIn() {
  const {data,setData,setUser,setActiveRole,navigate}=useApp();
  const [email,setEmail]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [loading,setLoad]=useState(false); const [showPw,setShowPw]=useState(false);
  const submit=async()=>{
    setErr("");
    if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr("Please enter a valid email.");
    if(!pw) return setErr("Please enter your password.");
    setLoad(true);

    if(isSupabaseConfigured()) {
      try {
        const { data: authData, error } = await supabaseSignIn(email,pw);
        if(!error && authData?.user) {
          const profile = await fetchProfile(authData.user.id);
          if(profile) {
            setUser(profile); setActiveRole(profile.roles?.[0] || 'manager');
            const [users, properties, workOrders, payments, components, reviews] = await Promise.all([
              fetchProfiles(), fetchAllUserProperties(authData.user.id), fetchWorkOrders(), fetchPayments(), fetchComponents(), fetchReviews(),
            ]);
            setData({ users: users.length ? users : [], properties: properties.length ? properties : [], workOrders: workOrders.length ? workOrders : [], payments: payments.length ? payments : [], components: components.length ? components : [], reviews: reviews.length ? reviews : [], invites: [], _nextId: data._nextId || SEED._nextId });
            navigate("dashboard"); setLoad(false);
            return;
          }
        }
      } catch {}
      // Supabase auth failed — fall through to local demo login
    }

    setTimeout(()=>{
      const u=SEED.users.find(x=>x.email===email&&x.password===pw) || data.users.find(x=>x.email===email&&x.password===pw);
      if(!u){setErr("Invalid email or password.");setLoad(false);return;}
      // Ensure we load seed data for demo users
      if(!data.properties.length) setData(SEED);
      setUser(u); setActiveRole(u.roles[0]); navigate("dashboard"); setLoad(false);
    },600);
  };
  return <div className="auth-page">
    <div className="auth-bg"><div className="bg-dots"/><div className="bg-arch arch-1"/><div className="bg-arch arch-2"/></div>
    <nav className="auth-nav"><span className="logo-link" onClick={()=>navigate("landing")}>TropicTask</span><div className="auth-nav-r">Don't have an account? <a onClick={()=>navigate("signup")}>Sign up free</a></div></nav>
    <main className="auth-main"><div className="auth-card"><div className="auth-card-body fade-up">
      <h1 className="auth-title">Welcome <em>back</em></h1>
      <p className="auth-sub">Sign in to your TropicTask account.</p>
      {err&&<div className="alert alert-error">⚠️ {err}</div>}
      <Field label="Email address"><div className="input-wrap"><span className="input-icon">✉️</span><input className="fi" type="email" placeholder="jane@smithpm.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/></div></Field>
      <Field label="Password"><div className="input-wrap"><span className="input-icon">🔒</span><input className="fi" type={showPw?"text":"password"} placeholder="Enter your password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/><button className="pw-tog" onClick={()=>setShowPw(!showPw)}>{showPw?"🙈":"👁"}</button></div></Field>
      <button className="btn-primary" onClick={submit} disabled={loading}>{loading?"Signing in…":"Sign in"}</button>
      <div className="divider"><div className="divider-line"/><div className="divider-text">demo accounts · password: pass123</div><div className="divider-line"/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[{r:"Manager",e:"jane@smithpm.com"},{r:"Owner",e:"robert@email.com"},{r:"Contractor",e:"mike@plumbing.com"},{r:"Tenant",e:"sarah@email.com"}].map(d=>(
          <button key={d.e} className="demo-btn" onClick={()=>{setEmail(d.e);setPw("pass123");}}>{d.r}</button>
        ))}
      </div>
      <div className="auth-prompt">Don't have an account? <a onClick={()=>navigate("signup")}>Create one free</a></div>
    </div></div></main>
  </div>;
}

/* ═══════════════════════════════════════════
   SIGN UP
   ═══════════════════════════════════════════ */
function SignUp() {
  const {data,setData,setUser,setActiveRole,navigate}=useApp();
  const [step,setStep]=useState(1);
  const [f,setF]=useState({name:"",email:"",phone:"",password:"",confirm:"",roles:[]});
  const [errs,setErrs]=useState({});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const toggleRole=r=>setF(p=>({...p,roles:p.roles.includes(r)?p.roles.filter(x=>x!==r):[...p.roles,r]}));

  const step1=()=>{
    const e={};
    if(!f.name.trim()) e.name=1; if(!f.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email=1;
    if(f.password.length<6) e.password=1; if(f.password!==f.confirm) e.confirm=1;
    if(data.users.find(u=>u.email===f.email)) e.taken=1;
    setErrs(e); if(Object.keys(e).length) return;
    setStep(2);
  };
  const step2=async()=>{
    if(!f.roles.length){setErrs({roles:1});return;}

    if (isSupabaseConfigured()) {
      const { data: authData, error } = await supabaseSignUp(f.email, f.password, {
        name: f.name,
        role: f.roles[0],
      });
      if (error) {
        setErrs({submit: error.message || 'Signup error'});
        return;
      }

      if (!authData?.user) {
        setErrs({submit: 'Signup succeeded but no user returned. Check if email confirmation is disabled.'});
        return;
      }

      // Small delay to let the trigger create the profile
      await new Promise(r => setTimeout(r, 500));
      const profile = await fetchProfile(authData.user.id);
      if (profile) {
        setUser(profile);
        setActiveRole(profile.roles?.[0] || 'manager');
        // Fetch all data with new session
        const [users, properties, workOrders, payments, components, reviews] = await Promise.all([
          fetchProfiles(), fetchAllUserProperties(authData.user.id), fetchWorkOrders(), fetchPayments(), fetchComponents(), fetchReviews(),
        ]);
        setData({ users: users.length ? users : [profile], properties, workOrders, payments, components, reviews, invites: [], _nextId: data._nextId || SEED._nextId });
        setStep(3); return;
      }

      // Fallback — profile trigger may not have fired yet, use local state
      const newUser={id:authData.user.id,email:f.email,name:f.name,phone:f.phone,roles:f.roles,company_name:null,license_number:null,trade:null,manager_id:null,property_id:null,stripe_customer_id:null};
      setData({...data,users:[...data.users,newUser],_nextId:{...data._nextId,u:data._nextId.u+1}});
      setUser(newUser); setActiveRole(f.roles[0]); setStep(3);
      return;
    }

    const id="u"+data._nextId.u;
    const newUser={id,email:f.email,password:f.password,name:f.name,phone:f.phone,roles:f.roles,company_name:null,license_number:null,trade:null,manager_id:null,property_id:null,stripe_customer_id:null};
    setData({...data,users:[...data.users,newUser],_nextId:{...data._nextId,u:data._nextId.u+1}});
    setUser(newUser); setActiveRole(f.roles[0]); setStep(3);
  };

  const ROLES=[{k:"manager",i:"🏢",n:"Property Manager",d:"I manage properties on behalf of owners"},{k:"owner",i:"🏠",n:"Property Owner",d:"I own property I manage or oversee"},{k:"contractor",i:"🔧",n:"Contractor",d:"I do maintenance and repair work"},{k:"tenant",i:"🔑",n:"Tenant",d:"I rent a property managed on TropicTask"}];

  return <div className="auth-page">
    <div className="auth-bg"><div className="bg-dots"/><div className="bg-arch arch-1"/><div className="bg-arch arch-2"/></div>
    <nav className="auth-nav"><span className="logo-link" onClick={()=>navigate("landing")}>TropicTask</span><div className="auth-nav-r">Already have an account? <a onClick={()=>navigate("signin")}>Sign in</a></div></nav>
    <main className="auth-main"><div className="auth-card" style={{maxWidth:480}}><div className="auth-card-body fade-up">
      {/* Step indicator */}
      <div className="step-bar">{[1,2,3].map(s=><React.Fragment key={s}>
        <div className="step-item"><div className={`step-num${step>s?" done":step===s?" active":""}`}>{step>s?"✓":s}</div><span className={`step-lbl${step>=s?" active":""}`}>{["Create account","Your profile","You're in"][s-1]}</span></div>
        {s<3&&<div className="step-line"><div className="step-fill" style={{width:step>s?"100%":"0%"}}/></div>}
      </React.Fragment>)}</div>

      {step===1&&<div className="fade-up">
        <h1 className="auth-title" style={{textAlign:"left"}}>Welcome to <em>TropicTask</em></h1>
        <p className="auth-sub" style={{textAlign:"left"}}>Create your free account. No credit card required.</p>
        <Field label="Full name"><input className={`fi no-icon${errs.name?" err":""}`} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Jane Smith"/></Field>
        <Field label="Email"><input className={`fi no-icon${errs.email||errs.taken?" err":""}`} type="email" value={f.email} onChange={e=>set("email",e.target.value)} placeholder="jane@example.com"/>{errs.taken&&<div className="f-err">Email already in use.</div>}</Field>
        <Field label="Phone (optional)"><input className="fi no-icon" value={f.phone} onChange={e=>set("phone",e.target.value)} placeholder="(555) 000-0000"/></Field>
        <Field label="Password"><input className={`fi no-icon${errs.password?" err":""}`} type="password" value={f.password} onChange={e=>set("password",e.target.value)} placeholder="At least 6 characters"/>{errs.password&&<div className="f-err">Min 6 characters.</div>}</Field>
        <Field label="Confirm password"><input className={`fi no-icon${errs.confirm?" err":""}`} type="password" value={f.confirm} onChange={e=>set("confirm",e.target.value)} placeholder="Re-enter password"/>{errs.confirm&&<div className="f-err">Passwords don't match.</div>}</Field>
        <button className="btn-primary" onClick={step1}>Create my account</button>
        <div className="auth-prompt">Already have an account? <a onClick={()=>navigate("signin")}>Sign in</a></div>
      </div>}

      {step===2&&<div className="fade-up">
        <h1 className="auth-title" style={{textAlign:"left"}}>Almost <em>there!</em></h1>
        <p className="auth-sub" style={{textAlign:"left"}}>Select your role(s). You can hold multiple roles.</p>
        <div className="role-grid">{ROLES.map(r=><div key={r.k} className={`role-card${f.roles.includes(r.k)?" selected":""}`} onClick={()=>{toggleRole(r.k);setErrs({});}}><div className="role-icon-lg">{r.i}</div><div className="role-name">{r.n}</div><div className="role-desc">{r.d}</div>{f.roles.includes(r.k)&&<div className="role-check">✓</div>}</div>)}</div>
        {errs.roles&&<div className="f-err" style={{marginBottom:16}}>Select at least one role.</div>}
        {errs.submit&&<div className="alert alert-error" style={{marginBottom:16}}>⚠️ {errs.submit}</div>}
        <button className="btn-primary" onClick={step2}>Set up my dashboard →</button>
      </div>}

      {step===3&&<div className="fade-up" style={{textAlign:"center"}}>
        <div className="success-icon">🌴</div>
        <h1 className="auth-title">You're <em>all set!</em></h1>
        <p className="auth-sub">Your TropicTask account is ready.</p>
        <button className="btn-primary" onClick={()=>navigate("dashboard")}>Go to my dashboard →</button>
      </div>}
    </div></div></main>
  </div>;
}

/* ═══════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════ */
function Dashboard() {
  const {user,activeRole,data,navigate,toast}=useApp();
  const U=useCallback(id=>data.users.find(u=>u.id===id),[data.users]);
  const P=useCallback(id=>data.properties.find(p=>p.id===id),[data.properties]);

  const myProps=useMemo(()=>activeRole==="owner"?data.properties.filter(p=>p.owner_id===user.id):activeRole==="tenant"?data.properties.filter(p=>p.id===user.property_id):data.properties.filter(p=>p.manager_id===user.id),[activeRole,user,data.properties]);
  const myWOs=useMemo(()=>activeRole==="contractor"?data.workOrders.filter(w=>w.contractor_id===user.id||(!w.contractor_id&&w.stage<=2)):activeRole==="tenant"?data.workOrders.filter(w=>w.submitted_by===user.id):data.workOrders,[activeRole,user,data.workOrders]);
  const openWOs=useMemo(()=>myWOs.filter(w=>w.stage<9),[myWOs]);
  const pendingPay=useMemo(()=>data.payments.filter(p=>p.status!=="paid"&&p.status!=="cancelled"),[data.payments]);
  const occupied=useMemo(()=>myProps.filter(p=>p.status==="occupied").length,[myProps]);

  // Expense aggregations memoized
  const expenseStats=useMemo(()=>{
    const allExpenses=data.expenses||[];
    const myExpenses=activeRole==="contractor"?allExpenses.filter(e=>e.contractor_id===user.id):activeRole==="owner"?allExpenses.filter(e=>myProps.some(p=>p.id===e.property_id)):allExpenses;
    const totalSpend=myExpenses.reduce((s,e)=>s+(+e.amount||0),0);
    const pendingSpend=myExpenses.filter(e=>e.status==="pending").reduce((s,e)=>s+(+e.amount||0),0);
    const approvedSpend=myExpenses.filter(e=>e.status==="approved").reduce((s,e)=>s+(+e.amount||0),0);
    const spendByProp=myProps.map(p=>({prop:p,total:allExpenses.filter(e=>e.property_id===p.id).reduce((s,e)=>s+(+e.amount||0),0)})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total).slice(0,3);
    // Spend by contractor
    const contractorIds=[...new Set(myExpenses.map(e=>e.contractor_id).filter(Boolean))];
    const spendByContractor=contractorIds.map(cid=>{const c=data.users.find(u=>u.id===cid);return {contractor:c,total:myExpenses.filter(e=>e.contractor_id===cid).reduce((s,e)=>s+(+e.amount||0),0)};}).filter(x=>x.contractor&&x.total>0).sort((a,b)=>b.total-a.total).slice(0,3);
    // Approval rate
    const approvalRate=myExpenses.length?Math.round((myExpenses.filter(e=>e.status==="approved").length/myExpenses.length)*100):0;
    return {myExpenses,totalSpend,pendingSpend,approvedSpend,spendByProp,spendByContractor,approvalRate};
  },[data.expenses,activeRole,user,myProps,data.users]);
  const {myExpenses,totalSpend,pendingSpend,approvedSpend,spendByProp,spendByContractor,approvalRate}=expenseStats;

  return <AppShell page="dashboard">
    <div className="page-header"><div><div className="page-title">Your <em>{activeRole==="contractor"?"Jobs":activeRole==="tenant"?"Home":"Properties"}</em></div><div className="page-sub">{activeRole==="manager"?"Overview of managed properties and open work orders":activeRole==="owner"?"A snapshot of your portfolio":activeRole==="contractor"?"Available work orders and your schedule":"Manage maintenance requests"}</div></div></div>

    {/* Quick Actions */}
    <div className="quick-actions">
      {activeRole!=="contractor"&&<button className="qa-btn primary" onClick={()=>navigate("workorders",{modal:"new"})}>{icons.plus} {activeRole==="tenant"?"Submit Request":"New Work Order"}</button>}
      {activeRole==="manager"&&<><button className="qa-btn" onClick={()=>navigate("payments")}>{icons.pay} Coordinate Payments</button><button className="qa-btn" onClick={()=>navigate("invite",{type:"tenant"})}>{icons.mail} Invite Tenant</button><button className="qa-btn" onClick={()=>navigate("properties",{modal:"add"})}>{icons.prop} Add Property</button></>}
      {activeRole==="contractor"&&<button className="qa-btn primary" onClick={()=>navigate("workorders")}>{icons.search} View Available Jobs</button>}
    </div>

    {/* Stats */}
    <div className="stats-row">
      <StatCard label="Properties" value={myProps.length} icon="🏠" onClick={()=>navigate("properties")}/>
      <StatCard label="Open Work Orders" value={openWOs.length} color={openWOs.length?"var(--warning)":undefined} icon="🔧" onClick={()=>navigate("workorders",{filter:"active"})}/>
      {activeRole!=="contractor"&&<StatCard label={activeRole==="tenant"?"Next Payment":"Pending Payments"} value={activeRole==="tenant"?`$${pendingPay.find(p=>p.recipient_id===user.id)?.amount||0}`:pendingPay.length} color={pendingPay.length?"var(--error)":undefined} icon="💰" onClick={()=>navigate("payments",{filter:"pending"})}/>}
      {activeRole==="contractor"&&<StatCard label="Rating" value={(()=>{const rs=data.reviews.filter(r=>r.contractor_id===user.id);return rs.length?(rs.reduce((s,r)=>s+r.stars,0)/rs.length).toFixed(1):"—";})()} color="var(--warning)" icon="⭐" sub={`${data.reviews.filter(r=>r.contractor_id===user.id).length} reviews`} onClick={()=>navigate("reports")}/>}
      {(activeRole==="manager"||activeRole==="owner")&&<StatCard label="Occupancy" value={myProps.length?Math.round(occupied/myProps.length*100)+"%":"—"} color="var(--success)" icon="📊" onClick={()=>navigate("properties",{filter:"occupied"})}/>}
    </div>

    {/* ═══ WORK ORDER PIPELINE ═══ */}
    {activeRole!=="tenant"&&<div className="panel" style={{marginBottom:24}}>
      <div className="panel-header"><div className="panel-title">Work Order <em>Pipeline</em></div><span className="panel-action" onClick={()=>navigate("workorders")}>View all →</span></div>
      <div style={{padding:"20px 24px 24px"}}>
        {/* Pipeline stages */}
        <div className="pipeline-grid">
          {STAGES.filter(s=>s.n<=9).map(s=>{
            const count=myWOs.filter(w=>w.stage===s.n).length;
            const maxCount=Math.max(...STAGES.map(st=>myWOs.filter(w=>w.stage===st.n).length),1);
            const pct=Math.max(count/maxCount*100,count?8:0);
            return <div key={s.n} className="pipeline-col">
              <div className="pipeline-bar-wrap">
                <div className="pipeline-bar" style={{height:`${pct}%`,background:s.color,opacity:count?1:.15}}/>
              </div>
              <div className="pipeline-count" style={{color:count?s.color:"var(--sand-dark)"}}>{count}</div>
              <div className="pipeline-label">{s.label}</div>
              <div className="pipeline-who">{s.who}</div>
            </div>;
          })}
        </div>
        {/* Pipeline summary row */}
        <div style={{display:"flex",gap:16,marginTop:20,paddingTop:16,borderTop:"1px solid rgba(0,83,87,.08)",flexWrap:"wrap"}}>
          {[
            {label:"Urgent",count:myWOs.filter(w=>w.priority==="urgent"&&w.stage<9).length,color:"var(--error)"},
            {label:"Unassigned",count:myWOs.filter(w=>!w.contractor_id&&w.stage<9).length,color:"var(--warning)"},
            {label:"In Progress",count:myWOs.filter(w=>w.stage>=5&&w.stage<=6).length,color:"var(--forest)"},
            {label:"Completed",count:myWOs.filter(w=>w.stage>=7).length,color:"var(--success)"},
          ].map(s=><div key={s.label} style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:s.color,opacity:s.count?.9:.2}}/>
            <span style={{color:"var(--text-muted)"}}>{s.label}</span>
            <strong style={{color:s.count?s.color:"var(--sand-dark)"}}>{s.count}</strong>
          </div>)}
        </div>
      </div>
    </div>}

    {/* ═══ EXPENSES OVERVIEW (Module 5) ═══ */}
    {activeRole!=="tenant"&&myExpenses.length>0&&<div className="panel" style={{marginBottom:24}}>
      <div className="panel-header"><div className="panel-title">Expense <em>Overview</em></div><span className="panel-action" onClick={()=>navigate("expenses")}>View all →</span></div>
      <div style={{padding:"20px 24px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:16,marginBottom:16}}>
          <div style={{padding:"14px 16px",background:"var(--forest-mist)",borderRadius:12}}>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>Total Spend</div>
            <div style={{fontFamily:"var(--font-display)",fontSize:24,fontWeight:700,color:"var(--forest)"}}>${totalSpend.toFixed(2)}</div>
            <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{myExpenses.length} record{myExpenses.length===1?"":"s"}</div>
          </div>
          <div style={{padding:"14px 16px",background:"var(--warning-bg)",borderRadius:12}}>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>Pending Review</div>
            <div style={{fontFamily:"var(--font-display)",fontSize:24,fontWeight:700,color:"var(--warning)"}}>${pendingSpend.toFixed(2)}</div>
            <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{myExpenses.filter(e=>e.status==="pending").length} awaiting approval</div>
          </div>
          <div style={{padding:"14px 16px",background:"var(--success-bg)",borderRadius:12}}>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>Approved</div>
            <div style={{fontFamily:"var(--font-display)",fontSize:24,fontWeight:700,color:"var(--success)"}}>${approvedSpend.toFixed(2)}</div>
            <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{myExpenses.filter(e=>e.status==="approved").length} approved</div>
          </div>
        </div>
        {(spendByProp.length>0||spendByContractor.length>0)&&<div className="breakdown-grid" style={{borderTop:"1px solid rgba(0,83,87,.08)",paddingTop:16}}>
          {spendByProp.length>0&&<div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"var(--text-muted)",marginBottom:10}}>Top Spending Properties</div>
            {spendByProp.map(({prop,total})=>{const pct=Math.round(total/(spendByProp[0].total||1)*100);return <div key={prop.id} style={{display:"flex",alignItems:"center",gap:12,padding:"6px 0"}}>
              <div className="prop-thumb" style={{width:30,height:30,fontSize:15,background:"var(--forest-mist)"}}>{prop.emoji||"🏠"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4,gap:8}}><span style={{fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{prop.address}</span><strong style={{flexShrink:0}}>${total.toFixed(0)}</strong></div>
                <div style={{height:5,background:"var(--sand)",borderRadius:5,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:"var(--forest)",borderRadius:5,transition:"width .4s"}}/></div>
              </div>
            </div>;})}
          </div>}
          {spendByContractor.length>0&&<div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"var(--text-muted)",marginBottom:10}}>Top Contractors by Spend</div>
            {spendByContractor.map(({contractor,total})=>{const pct=Math.round(total/(spendByContractor[0].total||1)*100);return <div key={contractor.id} style={{display:"flex",alignItems:"center",gap:12,padding:"6px 0"}}>
              <div className="avatar-sm" style={{width:30,height:30,fontSize:11}}>{initials(contractor.name)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4,gap:8}}><span style={{fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{contractor.name}{contractor.trade?` · ${contractor.trade}`:""}</span><strong style={{flexShrink:0}}>${total.toFixed(0)}</strong></div>
                <div style={{height:5,background:"var(--sand)",borderRadius:5,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:"#1a6b7a",borderRadius:5,transition:"width .4s"}}/></div>
              </div>
            </div>;})}
          </div>}
        </div>}
        {/* Approval rate strip */}
        {myExpenses.length>0&&activeRole==="manager"&&<div style={{marginTop:16,padding:"12px 14px",background:"var(--beige)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:42,height:42,borderRadius:"50%",background:approvalRate>=70?"var(--success-bg)":"var(--warning-bg)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-display)",fontSize:14,fontWeight:700,color:approvalRate>=70?"var(--success)":"var(--warning)"}}>{approvalRate}%</div>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>Approval Rate</div>
              <div style={{fontSize:11,color:"var(--text-muted)"}}>{myExpenses.filter(e=>e.status==="approved").length} of {myExpenses.length} expenses approved</div>
            </div>
          </div>
          {myExpenses.filter(e=>e.status==="pending").length>0&&<button className="btn-sm primary" style={{padding:"6px 12px",fontSize:12}} onClick={()=>navigate("expenses")}>Review {myExpenses.filter(e=>e.status==="pending").length} pending →</button>}
        </div>}
      </div>
    </div>}

    <div className="content-grid">
      <div>
        {/* Properties panel */}
        <div className="panel"><div className="panel-header"><div className="panel-title">{activeRole==="tenant"?"My ":""}<em>Properties</em></div><span className="panel-action" onClick={()=>navigate("properties")}>View all →</span></div>
          {myProps.slice(0,4).map(p=>{const woCount=data.workOrders.filter(w=>w.property_id===p.id&&w.stage<9).length;return <div key={p.id} className="list-row" onClick={()=>navigate("properties",{detail:p.id})}>
            <div className="prop-thumb" style={{background:"var(--forest-mist)"}}>{p.emoji||"🏠"}</div>
            <div style={{flex:1,minWidth:0}}><div className="row-title">{p.address}</div><div className="row-sub">{p.beds} bed · {p.baths} bath · {p.city}, {p.state}</div></div>
            <div style={{textAlign:"center",minWidth:45}}><div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:woCount?"var(--warning)":"var(--sand-dark)"}}>{woCount}</div><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:".05em",color:"var(--text-muted)"}}>WOs</div></div>
            <Badge c={p.status==="occupied"?"b-green":"b-grey"}>{p.status==="occupied"?"Occupied":"Vacant"}</Badge>
          </div>;})}
          {!myProps.length&&<EmptyState icon="🏠" text="No properties yet" sub="Add your first property to get started"/>}
        </div>

        {/* Recent Work Orders */}
        <div className="panel"><div className="panel-header"><div className="panel-title">Recent <em>Work Orders</em></div><span className="panel-action" onClick={()=>navigate("workorders")}>View all →</span></div>
          {openWOs.slice(0,5).map(wo=>{const p=P(wo.property_id); const st=getStage(wo.stage); return <div key={wo.id} className="list-row" onClick={()=>navigate("workorders",{detail:wo.id})}>
            <div className={`pri-bar pri-${wo.priority}`}/>
            <div style={{flex:1,minWidth:0}}><div className="row-title">{wo.title}</div><div className="row-sub">{p?.address} · {wo.contractor_id?U(wo.contractor_id)?.name:"Unassigned"}</div></div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}><Badge c={priBadge(wo.priority)}>{priLabel(wo.priority)}</Badge><Badge c={stageBadge(wo.stage)}>{st.label}</Badge></div>
          </div>;})}
          {!openWOs.length&&<EmptyState icon="🔧" text="No open work orders"/>}
        </div>
      </div>

      <div>
        {/* Payments */}
        <div className="panel"><div className="panel-header"><div className="panel-title"><em>Payments</em></div><span className="panel-action" onClick={()=>navigate("payments")}>View all →</span></div>
          {data.payments.slice(0,5).map(pay=><div key={pay.id} className="list-row" onClick={()=>navigate("payments",{filter:pay.status})}>
            <div style={{width:38,height:38,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,background:pay.status==="paid"?"var(--success-bg)":pay.status==="overdue"?"var(--error-bg)":"var(--warning-bg)"}}>{pay.type==="rent"?"🏠":"🔧"}</div>
            <div style={{flex:1,minWidth:0}}><div className="row-title">{pay.title||pay.note||'Payment'}</div><div className="row-sub">{P(pay.property_id)?.address}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontFamily:"var(--font-display)",fontSize:16,fontWeight:700}}>${pay.amount}</div><Badge c={pay.status==="paid"?"b-green":pay.status==="overdue"?"b-red":"b-amber"}>{pay.status}</Badge></div>
          </div>)}
          {!data.payments.length&&<EmptyState icon="💰" text="No payments yet"/>}
        </div>

        {/* Activity Feed */}
        {activeRole!=="tenant"&&<div className="panel"><div className="panel-header"><div className="panel-title"><em>Activity</em></div><span className="panel-action" onClick={()=>navigate("workorders")}>View all →</span></div>
          {openWOs.slice(0,4).map(wo=>{const st=getStage(wo.stage);return <div key={wo.id} className="list-row" style={{gap:10}} onClick={()=>navigate("workorders",{detail:wo.id})}>
            <div style={{width:8,height:8,borderRadius:"50%",background:st.color,flexShrink:0,marginTop:5}}/>
            <div style={{flex:1,fontSize:13,color:"var(--text-body)",lineHeight:1.55}}><strong>{wo.wo_number}</strong> — {wo.title} → <span style={{color:st.color}}>{st.label}</span></div>
            <span style={{fontSize:11,color:"var(--text-muted)",flexShrink:0}}>{daysAgo(wo.created_at)}</span>
          </div>;})}
          {!openWOs.length&&<EmptyState icon="✨" text="All caught up" sub="No active work orders"/>}
        </div>}
      </div>
    </div>
  </AppShell>;
}

/* ═══════════════════════════════════════════
   PROPERTIES PAGE
   ═══════════════════════════════════════════ */
function PropertiesPage() {
  const {user,activeRole,data,navigate,toast,createProperty,updateProperty,deleteProperty,params}=useApp();
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState(()=>params?.filter||"all");
  const [showAdd,setShowAdd]=useState(()=>params?.modal==="add");
  const [detail,setDetail]=useState(()=>params?.detail||null);
  const [showEdit,setShowEdit]=useState(null); const [confirmDelete,setConfirmDelete]=useState(null);
  const [af,setAf]=useState({address:"",city:"",state:"MS",zip:"",beds:3,baths:2,type:"SFR",owner_id:"",monthly_rent:"",notes:""});
  const [ef,setEf]=useState({address:"",city:"",state:"",zip:"",beds:0,baths:0,type:"",owner_id:"",monthly_rent:0,notes:"",status:""});
  const props=useMemo(()=>{
    let list=activeRole==="owner"?data.properties.filter(p=>p.owner_id===user.id):activeRole==="tenant"?data.properties.filter(p=>p.id===user.property_id):data.properties.filter(p=>p.manager_id===user.id);
    if(filter!=="all") list=list.filter(p=>p.status===filter);
    if(search) list=list.filter(p=>p.address.toLowerCase().includes(search.toLowerCase())||p.city.toLowerCase().includes(search.toLowerCase()));
    return list;
  },[data,activeRole,user,filter,search]);

  const addProp=async ()=>{
    if(!af.address.trim()||!af.city.trim()) return;
    const candidate={address:af.address,city:af.city,state:af.state,zip:af.zip,type:af.type,beds:+af.beds,baths:+af.baths,sqft:0,year_built:0,monthly_rent:+af.monthly_rent||0,status:"vacant",manager_id:user.id,owner_id:af.owner_id||null,notes:af.notes};
    await createProperty(candidate);
    setShowAdd(false); setAf({address:"",city:"",state:"MS",zip:"",beds:3,baths:2,type:"SFR",owner_id:"",monthly_rent:"",notes:""});
  };
  const openEdit=(p)=>{setEf({address:p.address,city:p.city,state:p.state,zip:p.zip||"",beds:p.beds,baths:p.baths,type:p.type,owner_id:p.owner_id||"",monthly_rent:p.monthly_rent||0,notes:p.notes||"",status:p.status});setShowEdit(p.id);setDetail(null);};
  const saveEdit=async()=>{
    if(!ef.address.trim()||!ef.city.trim()) return;
    await updateProperty(showEdit,{address:ef.address,city:ef.city,state:ef.state,zip:ef.zip,type:ef.type,beds:+ef.beds,baths:+ef.baths,monthly_rent:+ef.monthly_rent||0,owner_id:ef.owner_id||null,notes:ef.notes,status:ef.status});
    setShowEdit(null);
  };
  const doDelete=async(id)=>{
    await deleteProperty(id);
    setConfirmDelete(null); setDetail(null);
  };
  const owners=data.users.filter(u=>u.roles.includes("owner"));
  const dp=detail?data.properties.find(p=>p.id===detail):null;

  return <AppShell page="properties">
    <div className="page-header"><div><div className="page-title">{activeRole==="owner"?"My ":""}<em>Properties</em></div><div className="page-sub">{props.length} propert{props.length===1?"y":"ies"}</div></div>
      {activeRole!=="tenant"&&<button className="btn-sm primary" onClick={()=>setShowAdd(true)}>{icons.plus} Add Property</button>}
    </div>
    <div className="filter-bar">
      {["all","occupied","vacant"].map(f=><div key={f} className={`ftab${filter===f?" active":""}`} onClick={()=>setFilter(f)}>{f==="all"?"All":f.charAt(0).toUpperCase()+f.slice(1)}</div>)}
      <div style={{position:"relative",marginLeft:"auto"}}><span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",opacity:.4}}>{icons.search}</span><input className="filter-search" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {props.map(p=>{const owner=data.users.find(u=>u.id===p.owner_id); const wos=data.workOrders.filter(w=>w.property_id===p.id&&w.stage<9).length;
        return <div key={p.id} className="prop-row-card" onClick={()=>setDetail(p.id)}>
          <div className="prc-thumb">{p.emoji||"🏠"}</div>
          <div className={`prc-stripe ${p.status==="occupied"?"s-green":"s-grey"}`}/>
          <div className="prc-body"><div className="prc-main"><div className="row-title">{p.address}</div><div className="row-sub">{p.city}, {p.state} {p.zip} · {p.beds}bd/{p.baths}ba</div>{owner&&<div className="prc-owner"><div className="prc-owner-av">{initials(owner.name)}</div><span>{owner.name}</span></div>}</div></div>
          <div className="prc-right"><div className="prc-wo"><div className="prc-wo-val" style={{color:wos?"var(--warning)":"var(--sand-dark)"}}>{wos}</div><div className="prc-wo-lbl">Open WOs</div></div><Badge c={p.status==="occupied"?"b-green":"b-grey"}>{p.status==="occupied"?"Occupied":"Vacant"}</Badge>{icons.chev}</div>
        </div>;
      })}
      {!props.length&&<EmptyState icon="🏠" text="No properties found"/>}
    </div>

    {/* Add Property Modal */}
    {showAdd&&<Modal title="Add <em>Property</em>" sub="Enter property details" onClose={()=>setShowAdd(false)}>
      <Field label="Street Address"><input className="fi no-icon" value={af.address} onChange={e=>setAf({...af,address:e.target.value})} placeholder="142 Oak Street"/></Field>
      <div className="form-row"><Field label="City"><input className="fi no-icon" value={af.city} onChange={e=>setAf({...af,city:e.target.value})} placeholder="Meridian"/></Field><div className="form-row"><Field label="State"><input className="fi no-icon" value={af.state} onChange={e=>setAf({...af,state:e.target.value})}/></Field><Field label="ZIP"><input className="fi no-icon" value={af.zip} onChange={e=>setAf({...af,zip:e.target.value})}/></Field></div></div>
      <div className="form-row"><Field label="Beds"><input className="fi no-icon" type="number" value={af.beds} onChange={e=>setAf({...af,beds:e.target.value})}/></Field><Field label="Baths"><input className="fi no-icon" type="number" value={af.baths} onChange={e=>setAf({...af,baths:e.target.value})}/></Field><Field label="Monthly Rent"><input className="fi no-icon" type="number" value={af.monthly_rent} onChange={e=>setAf({...af,monthly_rent:e.target.value})} placeholder="1200"/></Field></div>
      {owners.length>0&&<Field label="Property Owner"><select className="fi no-icon sel" value={af.owner_id} onChange={e=>setAf({...af,owner_id:e.target.value})}><option value="">Select owner…</option>{owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>}
      <Field label="Notes"><textarea className="fi no-icon ta" value={af.notes} onChange={e=>setAf({...af,notes:e.target.value})} placeholder="Gate codes, special instructions…"/></Field>
      <button className="btn-primary" style={{marginTop:12}} onClick={addProp}>Add Property</button>
    </Modal>}

    {/* Property Detail Slide Panel */}
    {dp&&(()=>{
      const propWOs=data.workOrders.filter(w=>w.property_id===dp.id);
      const openWOs=propWOs.filter(w=>w.stage<9);
      const propExpenses=(data.expenses||[]).filter(e=>e.property_id===dp.id);
      const totalSpent=propExpenses.reduce((s,e)=>s+(+e.amount||0),0);
      const propComponents=data.components.filter(c=>c.property_id===dp.id);
      const propTenant=data.users.find(u=>u.property_id===dp.id);
      const propPayments=data.payments.filter(p=>p.property_id===dp.id);
      const owner=data.users.find(u=>u.id===dp.owner_id);

      return <SlidePanel title={`<em>${dp.address}</em>`} sub={`${dp.city}, ${dp.state} ${dp.zip}`} onClose={()=>setDetail(null)}>
        <div style={{padding:24}}>
          {/* Hero header with property emoji + status */}
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,padding:"16px 18px",background:"var(--forest-mist)",borderRadius:16}}>
            <div style={{width:60,height:60,borderRadius:14,background:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,flexShrink:0}}>{dp.emoji||"🏠"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:"var(--text-body)"}}>{dp.type} · {dp.beds} bed · {dp.baths} bath</div>
              <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{dp.sqft?`${dp.sqft.toLocaleString()} sqft · `:""}Built {dp.year_built||"—"}</div>
            </div>
            <Badge c={dp.status==="occupied"?"b-green":dp.status==="alert"?"b-amber":"b-grey"}>{dp.status}</Badge>
          </div>

          {/* Quick stats grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
            <div style={{padding:"12px 10px",background:"var(--success-bg)",borderRadius:12,textAlign:"center"}}><div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:"var(--success)"}}>${(dp.monthly_rent||0).toLocaleString()}</div><div style={{fontSize:10,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>Rent / mo</div></div>
            <div style={{padding:"12px 10px",background:openWOs.length?"var(--warning-bg)":"var(--forest-mist)",borderRadius:12,textAlign:"center"}}><div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:openWOs.length?"var(--warning)":"var(--forest)"}}>{openWOs.length}</div><div style={{fontSize:10,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>Open WOs</div></div>
            <div style={{padding:"12px 10px",background:"var(--blue-mist)",borderRadius:12,textAlign:"center"}}><div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:"#1a6b7a"}}>${totalSpent.toFixed(0)}</div><div style={{fontSize:10,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>Total Spent</div></div>
          </div>

          {/* Details */}
          <div className="sec-label">Property Details</div>
          <div className="detail-grid" style={{marginBottom:20}}>
            <div className="dg-row"><span>Owner</span><strong>{owner?.name||"—"}</strong></div>
            {propTenant&&<div className="dg-row"><span>Tenant</span><strong>{propTenant.name}</strong></div>}
            <div className="dg-row"><span>Square Feet</span><strong>{dp.sqft?dp.sqft.toLocaleString():"—"}</strong></div>
            <div className="dg-row"><span>Year Built</span><strong>{dp.year_built||"—"}</strong></div>
            {dp.notes&&<div className="dg-row"><span>Notes</span><strong style={{textAlign:"right",maxWidth:"60%"}}>{dp.notes}</strong></div>}
          </div>

          {/* Components */}
          <div style={{marginBottom:20}}>
            <div className="sec-label">Components ({propComponents.length})</div>
            {propComponents.length===0&&<div style={{fontSize:13,color:"var(--text-muted)",padding:"14px",background:"var(--beige)",borderRadius:12,textAlign:"center"}}>No components tracked yet</div>}
            {propComponents.map(c=><div key={c.id} className="list-row" style={{padding:"10px 12px",border:"1px solid rgba(0,83,87,.08)",borderRadius:12,marginBottom:6,gap:10}}>
              <span style={{fontSize:22}}>{c.icon}</span>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{c.name}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>Installed {c.installed} · Last serviced {c.last_serviced}</div></div>
              <Badge c={c.warranty_status==="ok"?"b-green":c.warranty_status==="soon"?"b-amber":"b-red"}>Warranty {c.warranty_expiry}</Badge>
            </div>)}
          </div>

          {/* Work Orders */}
          {propWOs.length>0&&<div style={{marginBottom:20}}>
            <div className="sec-label">Work Orders ({propWOs.length})</div>
            {propWOs.slice(0,6).map(wo=>{const st=getStage(wo.stage);return <div key={wo.id} className="list-row" style={{padding:"10px 12px",border:"1px solid rgba(0,83,87,.08)",borderRadius:12,marginBottom:6,gap:10,cursor:"pointer"}} onClick={()=>{setDetail(null);navigate("workorders",{detail:wo.id});}}>
              <div className={`pri-bar pri-${wo.priority}`} style={{height:32}}/>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{wo.wo_number} — {wo.title}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>{wo.category} · {daysAgo(wo.created_at)}</div></div>
              <Badge c={stageBadge(wo.stage)}>{st.label}</Badge>
            </div>;})}
          </div>}

          {/* Expenses summary */}
          {propExpenses.length>0&&<div style={{marginBottom:20}}>
            <div className="sec-label">Expense Summary ({propExpenses.length})</div>
            <div style={{padding:"12px 14px",background:"var(--forest-mist)",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div><div style={{fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>Total Spent on this Property</div><div style={{fontFamily:"var(--font-display)",fontSize:24,fontWeight:700,color:"var(--forest)"}}>${totalSpent.toFixed(2)}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"var(--text-muted)"}}>{propExpenses.filter(e=>e.status==="pending").length} pending</div><div style={{fontSize:12,color:"var(--success)",fontWeight:600}}>${propExpenses.filter(e=>e.status==="approved").reduce((s,e)=>s+(+e.amount||0),0).toFixed(2)} approved</div></div>
            </div>
          </div>}

          {/* Recent Payments */}
          {propPayments.length>0&&<div style={{marginBottom:20}}>
            <div className="sec-label">Payments ({propPayments.length})</div>
            {propPayments.slice(0,4).map(pay=><div key={pay.id} className="list-row" style={{padding:"10px 12px",border:"1px solid rgba(0,83,87,.08)",borderRadius:12,marginBottom:6,gap:10,cursor:"pointer"}} onClick={()=>{setDetail(null);navigate("payments",{detail:pay.id});}}>
              <div style={{width:34,height:34,borderRadius:10,background:pay.status==="paid"?"var(--success-bg)":pay.status==="overdue"?"var(--error-bg)":"var(--warning-bg)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{pay.type==="rent"?"🏠":"💰"}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{pay.title||pay.note||"Payment"}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>Due: {pay.due_date} · {pay.type}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontFamily:"var(--font-display)",fontSize:15,fontWeight:700}}>${pay.amount}</div><Badge c={pay.status==="paid"?"b-green":pay.status==="overdue"?"b-red":"b-amber"}>{pay.status}</Badge></div>
            </div>)}
          </div>}

          {activeRole==="manager"&&<div style={{display:"flex",gap:10,paddingTop:12,borderTop:"1px solid rgba(0,83,87,.08)"}}>
            <button className="btn-sm primary" onClick={()=>openEdit(dp)}>Edit Property</button>
            <button className="btn-sm ghost" style={{color:"var(--error)",borderColor:"var(--error)"}} onClick={()=>setConfirmDelete(dp.id)}>Delete</button>
          </div>}
        </div>
      </SlidePanel>;
    })()}

    {/* Edit Property Modal */}
    {showEdit&&<Modal title="Edit <em>Property</em>" sub="Update property details" onClose={()=>setShowEdit(null)}>
      <Field label="Street Address"><input className="fi no-icon" value={ef.address} onChange={e=>setEf({...ef,address:e.target.value})}/></Field>
      <div className="form-row"><Field label="City"><input className="fi no-icon" value={ef.city} onChange={e=>setEf({...ef,city:e.target.value})}/></Field><div className="form-row"><Field label="State"><input className="fi no-icon" value={ef.state} onChange={e=>setEf({...ef,state:e.target.value})}/></Field><Field label="ZIP"><input className="fi no-icon" value={ef.zip} onChange={e=>setEf({...ef,zip:e.target.value})}/></Field></div></div>
      <div className="form-row"><Field label="Beds"><input className="fi no-icon" type="number" value={ef.beds} onChange={e=>setEf({...ef,beds:e.target.value})}/></Field><Field label="Baths"><input className="fi no-icon" type="number" value={ef.baths} onChange={e=>setEf({...ef,baths:e.target.value})}/></Field><Field label="Monthly Rent"><input className="fi no-icon" type="number" value={ef.monthly_rent} onChange={e=>setEf({...ef,monthly_rent:e.target.value})}/></Field></div>
      <Field label="Status"><select className="fi no-icon sel" value={ef.status} onChange={e=>setEf({...ef,status:e.target.value})}><option value="occupied">Occupied</option><option value="vacant">Vacant</option></select></Field>
      {owners.length>0&&<Field label="Property Owner"><select className="fi no-icon sel" value={ef.owner_id} onChange={e=>setEf({...ef,owner_id:e.target.value})}><option value="">Select owner…</option>{owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>}
      <Field label="Notes"><textarea className="fi no-icon ta" value={ef.notes} onChange={e=>setEf({...ef,notes:e.target.value})}/></Field>
      <button className="btn-primary" style={{marginTop:12}} onClick={saveEdit}>Save Changes</button>
    </Modal>}

    {/* Delete Confirmation Modal */}
    {confirmDelete&&<Modal title="Delete <em>Property</em>" onClose={()=>setConfirmDelete(null)}>
      <p style={{fontSize:14,color:"var(--text-body)",lineHeight:1.6,marginBottom:16}}>Are you sure you want to delete this property? This action cannot be undone. Any associated work orders and payments will remain but will no longer be linked to this property.</p>
      <div style={{display:"flex",gap:10}}>
        <button className="btn-sm ghost" onClick={()=>setConfirmDelete(null)}>Cancel</button>
        <button className="btn-sm primary" style={{background:"var(--error)"}} onClick={()=>doDelete(confirmDelete)}>Delete Property</button>
      </div>
    </Modal>}
  </AppShell>;
}

/* ═══════════════════════════════════════════
   WORK ORDERS PAGE (9-stage lifecycle)
   ═══════════════════════════════════════════ */
function WorkOrdersPage() {
  const {user,activeRole,data,navigate,toast,createWorkOrder,setWorkOrderStage,assignContractor,createExpense,setExpenseStatus,deleteExpense,params}=useApp();
  const [filter,setFilter]=useState(()=>params?.filter||"active");
  const [search,setSearch]=useState("");
  const [showNew,setShowNew]=useState(()=>params?.modal==="new");
  const [detail,setDetail]=useState(()=>params?.detail||null);
  const [nf,setNf]=useState(()=>({title:"",property_id:params?.property_id||"",category:params?.category||"general",priority:"normal",notes:"",timing:"immediate",contractor_id:""}));
  const [showExpense,setShowExpense]=useState(false);
  const [expenseForm,setExpenseForm]=useState({amount:"",description:"",payment_type:"company_card",receipt_url:null,receipt_name:null});
  const [previewReceipt,setPreviewReceipt]=useState(null);

  const fileInputRef=useRef(null);
  const ALLOWED_RECEIPT_TYPES = ["image/jpeg","image/jpg","image/png","image/webp","image/gif","image/heic","application/pdf"];
  const ALLOWED_RECEIPT_EXTS = /\.(jpe?g|png|webp|gif|heic|pdf)$/i;
  const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;
  const onReceiptFile=(e)=>{
    const file=e.target.files?.[0];
    e.target.value=""; // always reset so re-selecting the same file works
    if(!file) return;
    // MIME type + extension check (some browsers don't set MIME for HEIC, etc.)
    const mimeOk = ALLOWED_RECEIPT_TYPES.includes((file.type||"").toLowerCase());
    const extOk = ALLOWED_RECEIPT_EXTS.test(file.name||"");
    if(!mimeOk && !extOk){
      toast('Unsupported format. Use JPG, PNG, WebP, HEIC, or PDF.');
      return;
    }
    if(file.size===0){
      toast('That file is empty.');
      return;
    }
    if(file.size>MAX_RECEIPT_BYTES){
      const sizeMB=(file.size/1024/1024).toFixed(1);
      toast(`File too large (${sizeMB}MB). Max is 2MB.`);
      return;
    }
    const reader=new FileReader();
    reader.onload=ev=>{
      const url=ev.target?.result;
      if(typeof url!=="string"||!url.startsWith("data:")){
        toast('Could not process file. Try another image.');
        return;
      }
      setExpenseForm(f=>({...f,receipt_url:url,receipt_name:file.name}));
      toast('Receipt attached.');
    };
    reader.onerror=()=>toast('Could not read file. Try again.');
    reader.onabort=()=>toast('Upload was cancelled.');
    try { reader.readAsDataURL(file); }
    catch { toast('Browser blocked file read.'); }
  };
  const submitExpense=async()=>{
    if(!expenseForm.amount||!expenseForm.description.trim()||!detail) return;
    const wo=data.workOrders.find(w=>w.id===detail); if(!wo) return;
    await createExpense({
      work_order_id:wo.id,
      property_id:wo.property_id,
      contractor_id:wo.contractor_id||user.id,
      amount:+expenseForm.amount,
      description:expenseForm.description.trim(),
      payment_type:expenseForm.payment_type,
      receipt_url:expenseForm.receipt_url,
      receipt_name:expenseForm.receipt_name,
    });
    setShowExpense(false);
    setExpenseForm({amount:"",description:"",payment_type:"company_card",receipt_url:null,receipt_name:null});
  };

  const myWOs=useMemo(()=>{
    let list=activeRole==="contractor"?data.workOrders.filter(w=>w.contractor_id===user.id||(!w.contractor_id&&w.stage<=2)):activeRole==="tenant"?data.workOrders.filter(w=>w.submitted_by===user.id):data.workOrders;
    if(filter==="active") list=list.filter(w=>w.stage<9);
    else if(filter==="closed") list=list.filter(w=>w.stage===9);
    if(search) list=list.filter(w=>w.title.toLowerCase().includes(search.toLowerCase())||w.wo_number.toLowerCase().includes(search.toLowerCase()));
    return list.sort((a,b)=>{const p={urgent:0,high:1,normal:2,low:3};return a.stage===b.stage?p[a.priority]-p[b.priority]:a.stage-b.stage;});
  },[data,activeRole,user,filter,search]);

  const [advancing,setAdvancing]=useState(false);
  const advanceStage=async (woId)=>{
    if(advancing) return;
    setAdvancing(true);
    try {
      const wo = data.workOrders.find(w=>w.id===woId);
      if(!wo) return;
      const updated = await setWorkOrderStage(woId, Math.min(wo.stage + 1, 9));
      if(updated) { toast("Work order updated!"); setDetail(null); }
    } finally { setAdvancing(false); }
  };
  const doAssignContractor=async (woId,cId)=>{
    const updated = await assignContractor(woId,cId);
    if(updated){ toast("Contractor assigned!"); }
  };
  const createWOAction=async ()=>{
    if(!nf.title.trim()||!nf.property_id) return;
    await createWorkOrder({property_id:nf.property_id,category:nf.category,title:nf.title,notes:nf.notes,timing:nf.timing,scheduled_date:null,scheduled_time:null,stage:1,priority:nf.priority,submitted_by:user.id,contractor_id:nf.contractor_id||null});
    setShowNew(false); setNf({title:"",property_id:"",category:"general",priority:"normal",notes:"",timing:"immediate",contractor_id:""});
  };

  const contractors=data.users.filter(u=>u.roles.includes("contractor"));
  const U=id=>data.users.find(u=>u.id===id); const P=id=>data.properties.find(p=>p.id===id);
  const dwo=detail?data.workOrders.find(w=>w.id===detail):null;
  const availProps=activeRole==="tenant"?data.properties.filter(p=>p.id===user.property_id):data.properties;
  const cats=["hvac","plumbing","electrical","roofing","appliances","landscaping","painting","general"];

  return <AppShell page="workorders">
    <div className="page-header"><div><div className="page-title">{activeRole==="tenant"?"My ":""}< em>Work Orders</em></div><div className="page-sub">{myWOs.length} work orders</div></div>
      {activeRole!=="contractor"&&<button className="btn-sm primary" onClick={()=>setShowNew(true)}>{icons.plus} {activeRole==="tenant"?"Submit Request":"New Work Order"}</button>}
    </div>
    <div className="filter-bar">
      {[["active","Active"],["closed","Closed"]].map(([k,l])=><div key={k} className={`ftab${filter===k?" active":""}`} onClick={()=>setFilter(k)}>{l}</div>)}
      <div style={{position:"relative",marginLeft:"auto"}}><span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",opacity:.4}}>{icons.search}</span><input className="filter-search" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    </div>

    <div className="panel">{myWOs.map(wo=>{const p=P(wo.property_id); const st=getStage(wo.stage); const assigned=U(wo.contractor_id);
      return <div key={wo.id} className="list-row" onClick={()=>setDetail(wo.id)}>
        <div className={`pri-bar pri-${wo.priority}`}/>
        <div style={{flex:1,minWidth:0}}><div className="row-title"><span style={{color:"var(--text-muted)",fontWeight:500,marginRight:8}}>{wo.wo_number}</span>{wo.title}</div><div className="row-sub">{p?.address} · {assigned?assigned.name:"Unassigned"} · {wo.category}</div></div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
          <Badge c={priBadge(wo.priority)}>{priLabel(wo.priority)}</Badge>
          <Badge c={stageBadge(wo.stage)}>Stage {wo.stage}: {st.label}</Badge>
          <span style={{fontSize:11,color:"var(--text-muted)"}}>{daysAgo(wo.created_at)}</span>
        </div>
      </div>;
    })}{!myWOs.length&&<EmptyState icon="🔧" text="No work orders found"/>}</div>

    {/* New Work Order Modal */}
    {showNew&&<Modal title="New <em>Work Order</em>" onClose={()=>setShowNew(false)}>
      <Field label="Title"><input className="fi no-icon" value={nf.title} onChange={e=>setNf({...nf,title:e.target.value})} placeholder="Brief description of the issue"/></Field>
      <div className="form-row">
        <Field label="Property"><select className="fi no-icon sel" value={nf.property_id} onChange={e=>setNf({...nf,property_id:e.target.value})}><option value="">Select…</option>{availProps.map(p=><option key={p.id} value={p.id}>{p.address}</option>)}</select></Field>
        <Field label="Category"><select className="fi no-icon sel" value={nf.category} onChange={e=>setNf({...nf,category:e.target.value})}>{cats.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></Field>
      </div>
      <div className="form-row">
        <Field label="Priority"><select className="fi no-icon sel" value={nf.priority} onChange={e=>setNf({...nf,priority:e.target.value})}><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></Field>
        <Field label="Timing"><select className="fi no-icon sel" value={nf.timing} onChange={e=>setNf({...nf,timing:e.target.value})}><option value="immediate">Immediate</option><option value="scheduled">Scheduled</option></select></Field>
      </div>
      {activeRole==="manager"&&<Field label="Assign Contractor (optional)"><select className="fi no-icon sel" value={nf.contractor_id} onChange={e=>setNf({...nf,contractor_id:e.target.value})}><option value="">Assign later…</option>{contractors.map(c=><option key={c.id} value={c.id}>{c.name} — {c.trade||c.company_name}</option>)}</select></Field>}
      <Field label="Details"><textarea className="fi no-icon ta" value={nf.notes} onChange={e=>setNf({...nf,notes:e.target.value})} placeholder="Detailed description…"/></Field>
      <button className="btn-primary" style={{marginTop:12}} onClick={createWOAction}>Create Work Order</button>
    </Modal>}

    {/* Work Order Detail Panel (9-stage lifecycle view) */}
    {dwo&&<SlidePanel title={`<em>${dwo.wo_number}</em>`} sub={dwo.title} onClose={()=>setDetail(null)} size="xl">
      <div style={{padding:24}}>
        {/* Stage progress */}
        <div className="sec-label">Lifecycle Progress</div>
        <div className="stage-track">{STAGES.map(s=><div key={s.n} className={`stage-dot${dwo.stage>=s.n?" done":""}${dwo.stage===s.n?" current":""}`}><div className="sd-n">{dwo.stage>s.n?"✓":s.n}</div><div className="sd-lbl">{s.label}</div></div>)}</div>

        <div className="detail-grid" style={{marginTop:20}}>
          <div className="dg-row"><span>Property</span><strong>{P(dwo.property_id)?.address}</strong></div>
          <div className="dg-row"><span>Category</span><strong>{dwo.category}</strong></div>
          <div className="dg-row"><span>Priority</span><Badge c={priBadge(dwo.priority)}>{priLabel(dwo.priority)}</Badge></div>
          <div className="dg-row"><span>Stage</span><Badge c={stageBadge(dwo.stage)}>Stage {dwo.stage}: {getStage(dwo.stage).label}</Badge></div>
          <div className="dg-row"><span>Submitted by</span><strong>{U(dwo.submitted_by)?.name}</strong></div>
          <div className="dg-row"><span>Contractor</span><strong>{dwo.contractor_id?U(dwo.contractor_id)?.name:"Unassigned"}</strong></div>
          <div className="dg-row"><span>Timing</span><strong>{dwo.timing}{dwo.scheduled_date?` · ${dwo.scheduled_date} ${dwo.scheduled_time||""}`:""}</strong></div>
          {dwo.notes&&<div style={{marginTop:8,padding:12,background:"var(--beige)",borderRadius:12,fontSize:13,lineHeight:1.6,color:"var(--text-body)"}}>{dwo.notes}</div>}
        </div>

        {/* Actions based on stage and role */}
        {dwo.stage<9&&<div style={{marginTop:20,padding:16,background:"var(--forest-mist)",borderRadius:16,border:"1px solid rgba(0,83,87,.12)"}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"var(--forest)",marginBottom:8}}>Next Action</div>
          <div style={{fontSize:13,color:"var(--text-body)",marginBottom:12}}><strong>{getStage(dwo.stage).who}</strong> — {getStage(dwo.stage).action}</div>

          {/* Assign contractor (manager, stage 1-2) */}
          {activeRole==="manager"&&dwo.stage<=2&&!dwo.contractor_id&&<div style={{marginBottom:8}}><select className="fi no-icon sel" style={{marginBottom:8}} onChange={e=>{if(e.target.value)doAssignContractor(dwo.id,e.target.value);}}><option value="">Assign contractor…</option>{contractors.map(c=><option key={c.id} value={c.id}>{c.name} — {c.trade}</option>)}</select></div>}

          {/* Advance button */}
          <button className="btn-sm primary" disabled={advancing} onClick={()=>advanceStage(dwo.id)}>{advancing?"Saving…":getStage(dwo.stage).action || "Advance"} →</button>
        </div>}

        {/* ═══ EXPENSES SECTION (Module 4) ═══ */}
        {(()=>{
          const woExpenses=(data.expenses||[]).filter(ex=>ex.work_order_id===dwo.id);
          const totalCost=woExpenses.reduce((s,ex)=>s+(+ex.amount||0),0);
          const approvedCost=woExpenses.filter(ex=>ex.status==="approved").reduce((s,ex)=>s+(+ex.amount||0),0);
          const canLog=activeRole==="contractor"||activeRole==="manager";
          return <div style={{marginTop:24}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div className="sec-label" style={{margin:0}}>Expenses & Receipts</div>
              {canLog&&<button className="btn-sm primary" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setShowExpense(true)}>{icons.plus} Log Expense</button>}
            </div>
            {woExpenses.length>0&&<div style={{background:"var(--forest-mist)",borderRadius:12,padding:"12px 14px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>Total Cost</div>
                <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:"var(--forest)"}}>${totalCost.toFixed(2)}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:"var(--text-muted)"}}>{woExpenses.length} expense{woExpenses.length===1?"":"s"}</div>
                <div style={{fontSize:12,color:"var(--success)",fontWeight:600}}>${approvedCost.toFixed(2)} approved</div>
              </div>
            </div>}
            {woExpenses.length===0&&<div style={{padding:"20px 16px",textAlign:"center",background:"var(--beige)",borderRadius:12,fontSize:13,color:"var(--text-muted)"}}>No expenses logged yet</div>}
            {woExpenses.map(ex=><div key={ex.id} className="expense-row">
              <div className="expense-icon">{ex.payment_type==="company_card"?"💳":"💵"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text-body)"}}>{ex.description}</div>
                <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>
                  {ex.payment_type==="company_card"?"Company Card":"Personal"} · {new Date(ex.created_at).toLocaleDateString()}
                  {ex.receipt_url&&<span style={{marginLeft:6,color:"var(--forest)",cursor:"pointer",fontWeight:600}} onClick={()=>setPreviewReceipt(ex)}> · 📎 Receipt</span>}
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:"var(--font-display)",fontSize:16,fontWeight:700}}>${(+ex.amount).toFixed(2)}</div>
                <Badge c={ex.status==="approved"?"b-green":"b-amber"}>{ex.status}</Badge>
              </div>
              {activeRole==="manager"&&ex.status==="pending"&&<button className="btn-sm" style={{background:"var(--success)",color:"white",padding:"5px 10px",fontSize:11,marginLeft:8}} onClick={()=>setExpenseStatus(ex.id,'approved')}>{icons.check}</button>}
            </div>)}
          </div>;
        })()}
      </div>
    </SlidePanel>}

    {/* Expense logging modal */}
    {showExpense&&<Modal title="Log <em>Expense</em>" sub="Record a job-related expense" onClose={()=>setShowExpense(false)}>
      <Field label="Amount ($)"><input className="fi no-icon" type="number" step="0.01" value={expenseForm.amount} onChange={e=>setExpenseForm({...expenseForm,amount:e.target.value})} placeholder="45.50"/></Field>
      <Field label="Description"><textarea className="fi no-icon ta" value={expenseForm.description} onChange={e=>setExpenseForm({...expenseForm,description:e.target.value})} placeholder="What was purchased or paid for"/></Field>
      <Field label="Payment Type"><select className="fi no-icon sel" value={expenseForm.payment_type} onChange={e=>setExpenseForm({...expenseForm,payment_type:e.target.value})}><option value="company_card">Company Card</option><option value="personal">Personal Funds</option></select></Field>
      <Field label="Receipt (optional)" sub="Upload an image or PDF — max 2MB">
        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif,.heic,.pdf,image/*,application/pdf" onChange={onReceiptFile} style={{display:"none"}}/>
        {!expenseForm.receipt_url&&<button type="button" className="receipt-uploader" onClick={()=>fileInputRef.current?.click()} style={{width:"100%",border:"1.5px dashed rgba(0,83,87,.25)",cursor:"pointer",background:"var(--beige)",padding:"18px 14px",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",gap:10,color:"var(--forest)",fontSize:13,fontWeight:500,fontFamily:"var(--font-body)"}}>{icons.upload} Click to choose receipt file</button>}
        {expenseForm.receipt_url&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--forest-mist)",borderRadius:12}}>
          {expenseForm.receipt_url.startsWith("data:image")?<img src={expenseForm.receipt_url} alt="" style={{width:36,height:36,borderRadius:6,objectFit:"cover"}}/>:<span style={{fontSize:22}}>📄</span>}
          <span style={{flex:1,fontSize:12,color:"var(--text-body)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{expenseForm.receipt_name}</span>
          <button type="button" className="btn-sm ghost" style={{padding:"4px 10px",fontSize:11}} onClick={()=>setExpenseForm({...expenseForm,receipt_url:null,receipt_name:null})}>Remove</button>
        </div>}
      </Field>
      <button className="btn-primary" style={{marginTop:12}} onClick={submitExpense}>Log Expense</button>
    </Modal>}

    {/* Receipt preview */}
    {previewReceipt&&<Modal title="Receipt <em>Preview</em>" sub={previewReceipt.description} onClose={()=>setPreviewReceipt(null)} wide>
      <div style={{textAlign:"center"}}>
        {previewReceipt.receipt_url?(previewReceipt.receipt_url.startsWith("data:image")?<img src={previewReceipt.receipt_url} alt="receipt" style={{maxWidth:"100%",maxHeight:"60vh",borderRadius:12}}/>:<div style={{padding:48,background:"var(--beige)",borderRadius:12}}><div style={{fontSize:48,marginBottom:12}}>📄</div><div style={{fontSize:14,fontWeight:600,marginBottom:6}}>{previewReceipt.receipt_name||"Receipt"}</div><a href={previewReceipt.receipt_url} download={previewReceipt.receipt_name||"receipt"} className="btn-sm primary" style={{padding:"6px 14px",fontSize:12,display:"inline-block",marginTop:8}}>Download</a></div>):<div style={{padding:48,color:"var(--text-muted)"}}>No receipt attached</div>}
        <div style={{marginTop:16,fontSize:13,color:"var(--text-muted)"}}>Amount: <strong style={{color:"var(--text-body)"}}>${(+previewReceipt.amount).toFixed(2)}</strong></div>
      </div>
    </Modal>}
  </AppShell>;
}

/* ═══════════════════════════════════════════
   PAYMENTS PAGE
   ═══════════════════════════════════════════ */
function PaymentsPage() {
  const {user,activeRole,data,toast,createPayment,markPaymentPaid,navigate,params}=useApp();
  const [filter,setFilter]=useState(()=>params?.filter||"all");
  const [showNew,setShowNew]=useState(()=>params?.modal==="new");
  const [detail,setDetail]=useState(()=>params?.detail||null);
  const [nf,setNf]=useState(()=>({title:"",property_id:params?.property_id||"",type:"rent",amount:"",frequency:"one_time",due_date:"",recipient_id:params?.recipient_id||"",note:""}));

  const pays=useMemo(()=>{
    let list=data.payments;
    if(filter!=="all") list=list.filter(p=>p.status===filter);
    return list;
  },[data,filter]);

  const markPaid=async id=>{ await markPaymentPaid(id); };
  const createPay=async ()=>{
    if(!nf.title||!nf.amount||!nf.property_id) return;
    const np={title:nf.title,property_id:nf.property_id,type:nf.type,amount:+nf.amount,frequency:nf.frequency,due_date:nf.due_date||new Date().toISOString().split("T")[0],created_by:user.id,recipient_id:nf.recipient_id||null,note:nf.note||nf.title};
    await createPayment(np);
    setShowNew(false); setNf({title:"",property_id:"",type:"rent",amount:"",frequency:"one_time",due_date:"",recipient_id:"",note:""});
  };
  const P=id=>data.properties.find(p=>p.id===id);
  const totalOut=data.payments.filter(p=>p.status!=="paid"&&p.status!=="cancelled").reduce((s,p)=>s+p.amount,0);

  return <AppShell page="payments">
    <div className="page-header"><div><div className="page-title">Coordinate <em>Payments</em></div><div className="page-sub">Track and manage all payment activity</div></div>
      {(activeRole==="manager"||activeRole==="owner")&&<button className="btn-sm primary" onClick={()=>setShowNew(true)}>{icons.plus} New Payment</button>}
    </div>
    <div className="stats-row" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
      <StatCard label="Outstanding" value={`$${totalOut.toLocaleString()}`} color={totalOut?"var(--warning)":"var(--success)"} onClick={()=>setFilter("pending")}/>
      <StatCard label="Pending" value={data.payments.filter(p=>p.status==="pending").length} onClick={()=>setFilter("pending")}/>
      <StatCard label="Paid" value={data.payments.filter(p=>p.status==="paid").length} color="var(--success)" onClick={()=>setFilter("paid")}/>
    </div>
    <div className="filter-bar" style={{marginBottom:16}}>{[["all","All"],["pending","Pending"],["overdue","Overdue"],["paid","Paid"]].map(([k,l])=><div key={k} className={`ftab${filter===k?" active":""}`} onClick={()=>setFilter(k)}>{l}</div>)}</div>
    <div className="panel">{pays.map(pay=><div key={pay.id} className="list-row" onClick={()=>setDetail(pay.id)}>
      <div style={{width:42,height:42,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,background:pay.status==="paid"?"var(--success-bg)":pay.status==="overdue"?"var(--error-bg)":"var(--warning-bg)"}}>{pay.type==="rent"?"🏠":pay.type==="maintenance"?"🔧":"💰"}</div>
      <div style={{flex:1,minWidth:0}}><div className="row-title">{pay.title||pay.note||'Payment'}</div><div className="row-sub">{P(pay.property_id)?.address} · Due: {pay.due_date} · {pay.frequency}</div></div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{textAlign:"right"}}><div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:pay.status==="paid"?"var(--success)":"var(--black)"}}>${pay.amount.toLocaleString()}</div><Badge c={pay.status==="paid"?"b-green":pay.status==="overdue"?"b-red":"b-amber"}>{pay.status}</Badge></div>
        {pay.status!=="paid"&&(activeRole==="manager"||activeRole==="owner")&&<button className="btn-sm" style={{background:"var(--success)",color:"white",padding:"6px 12px",fontSize:11}} onClick={e=>{e.stopPropagation();markPaid(pay.id);}}>Mark Paid</button>}
      </div>
    </div>)}{!pays.length&&<EmptyState icon="💰" text="No payments found"/>}</div>

    {/* Payment Detail */}
    {detail&&(()=>{const pay=data.payments.find(p=>p.id===detail);if(!pay)return null;const prop=P(pay.property_id);const recipient=data.users.find(u=>u.id===pay.recipient_id);const creator=data.users.find(u=>u.id===pay.created_by);return <SlidePanel title={`<em>${pay.title||"Payment"}</em>`} sub={`${pay.type} · ${pay.frequency}`} onClose={()=>setDetail(null)}>
      <div style={{padding:24}}>
        <div style={{textAlign:"center",marginBottom:20,padding:"20px 16px",background:pay.status==="paid"?"var(--success-bg)":pay.status==="overdue"?"var(--error-bg)":"var(--warning-bg)",borderRadius:16}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"var(--text-muted)",marginBottom:6}}>Amount Due</div>
          <div style={{fontFamily:"var(--font-display)",fontSize:38,fontWeight:700,color:pay.status==="paid"?"var(--success)":pay.status==="overdue"?"var(--error)":"var(--warning)"}}>${pay.amount.toLocaleString()}</div>
          <Badge c={pay.status==="paid"?"b-green":pay.status==="overdue"?"b-red":"b-amber"}>{pay.status}</Badge>
        </div>
        <div className="sec-label">Details</div>
        <div className="detail-grid" style={{marginBottom:20}}>
          <div className="dg-row"><span>Property</span><strong style={{cursor:"pointer",color:"var(--forest)"}} onClick={()=>{setDetail(null);navigate("properties",{detail:prop?.id});}}>{prop?.address||"—"}</strong></div>
          <div className="dg-row"><span>Type</span><strong style={{textTransform:"capitalize"}}>{pay.type.replace(/_/g," ")}</strong></div>
          <div className="dg-row"><span>Frequency</span><strong style={{textTransform:"capitalize"}}>{pay.frequency.replace(/_/g," ")}</strong></div>
          <div className="dg-row"><span>Due Date</span><strong>{pay.due_date}</strong></div>
          {recipient&&<div className="dg-row"><span>Recipient</span><strong>{recipient.name}</strong></div>}
          {creator&&<div className="dg-row"><span>Created by</span><strong>{creator.name}</strong></div>}
          {pay.note&&pay.note!==pay.title&&<div className="dg-row"><span>Note</span><strong style={{textAlign:"right",maxWidth:"60%"}}>{pay.note}</strong></div>}
        </div>
        {pay.status!=="paid"&&(activeRole==="manager"||activeRole==="owner")&&<button className="btn-primary" style={{background:"var(--success)"}} onClick={async()=>{await markPaid(pay.id);setDetail(null);}}>Mark as Paid</button>}
      </div>
    </SlidePanel>;})()}

    {showNew&&<Modal title="New <em>Payment</em>" onClose={()=>setShowNew(false)}>
      <Field label="Title"><input className="fi no-icon" value={nf.title} onChange={e=>setNf({...nf,title:e.target.value})} placeholder="April Rent"/></Field>
      <div className="form-row">
        <Field label="Property"><select className="fi no-icon sel" value={nf.property_id} onChange={e=>setNf({...nf,property_id:e.target.value})}><option value="">Select…</option>{data.properties.map(p=><option key={p.id} value={p.id}>{p.address}</option>)}</select></Field>
        <Field label="Amount"><input className="fi no-icon" type="number" value={nf.amount} onChange={e=>setNf({...nf,amount:e.target.value})} placeholder="1200"/></Field>
      </div>
      <div className="form-row">
        <Field label="Type"><select className="fi no-icon sel" value={nf.type} onChange={e=>setNf({...nf,type:e.target.value})}><option value="rent">Rent</option><option value="deposit">Deposit</option><option value="maintenance">Maintenance</option><option value="management_fee">Management Fee</option><option value="late_fee">Late Fee</option><option value="other">Other</option></select></Field>
        <Field label="Frequency"><select className="fi no-icon sel" value={nf.frequency} onChange={e=>setNf({...nf,frequency:e.target.value})}><option value="one_time">One-time</option><option value="monthly">Monthly</option></select></Field>
      </div>
      <Field label="Due Date"><input className="fi no-icon" type="date" value={nf.due_date} onChange={e=>setNf({...nf,due_date:e.target.value})}/></Field>
      <Field label="Recipient"><select className="fi no-icon sel" value={nf.recipient_id} onChange={e=>setNf({...nf,recipient_id:e.target.value})}><option value="">Select…</option>{data.users.filter(u=>u.id!==user.id).map(u=><option key={u.id} value={u.id}>{u.name} ({u.roles.join(", ")})</option>)}</select></Field>
      <Field label="Note"><textarea className="fi no-icon ta" value={nf.note} onChange={e=>setNf({...nf,note:e.target.value})} placeholder="Optional context…"/></Field>
      <button className="btn-primary" style={{marginTop:12}} onClick={createPay}>Create Payment</button>
    </Modal>}
  </AppShell>;
}

/* ═══════════════════════════════════════════
   CONTRACTORS / TENANTS PAGES
   ═══════════════════════════════════════════ */
function PeoplePage({type}) {
  const {data,activeRole,navigate,params}=useApp();
  const [detail,setDetail]=useState(()=>params?.detail||null);
  const people=data.users.filter(u=>u.roles.includes(type));
  const title=type==="contractor"?"Contractors":"Tenants";
  const dp=detail?people.find(u=>u.id===detail):null;
  const prop=dp?data.properties.find(p=>type==="tenant"?p.id===dp.property_id:false):null;

  return <AppShell page={type+"s"}>
    <div className="page-header"><div><div className="page-title"><em>{title}</em></div><div className="page-sub">{people.length} {title.toLowerCase()}</div></div></div>
    <div className="panel">{people.map(p=><div key={p.id} className="list-row" onClick={()=>setDetail(p.id)}>
      <div className="avatar-sm">{initials(p.name)}</div>
      <div style={{flex:1}}><div className="row-title">{p.name}</div><div className="row-sub">{p.email}{p.company_name?` · ${p.company_name}`:""}{p.trade?` · ${p.trade}`:""}</div></div>
      {type==="contractor"&&<div style={{display:"flex",alignItems:"center",gap:4}}>{icons.star}<span style={{fontSize:13,fontWeight:600}}>{(data.reviews.filter(r=>r.contractor_id===p.id).reduce((s,r)=>s+r.stars,0)/(data.reviews.filter(r=>r.contractor_id===p.id).length||1)).toFixed(1)}</span></div>}
      {type==="tenant"&&<Badge c="b-forest">{data.properties.find(pr=>pr.id===p.property_id)?.address||"No unit"}</Badge>}
      {icons.chev}
    </div>)}{!people.length&&<EmptyState icon="👥" text={`No ${title.toLowerCase()} yet`}/>}</div>

    {dp&&(()=>{
      const reviews=data.reviews.filter(r=>r.contractor_id===dp.id);
      const avgRating=reviews.length?(reviews.reduce((s,r)=>s+r.stars,0)/reviews.length):0;
      const contractorWOs=type==="contractor"?data.workOrders.filter(w=>w.contractor_id===dp.id):[];
      const activeJobs=contractorWOs.filter(w=>w.stage<9);
      const completedJobs=contractorWOs.filter(w=>w.stage===9);
      const contractorExpenses=type==="contractor"?(data.expenses||[]).filter(e=>e.contractor_id===dp.id):[];
      const totalEarnings=contractorExpenses.filter(e=>e.status==="approved").reduce((s,e)=>s+(+e.amount||0),0);
      const tenantWOs=type==="tenant"?data.workOrders.filter(w=>w.submitted_by===dp.id):[];
      const tenantPayments=type==="tenant"?data.payments.filter(p=>p.recipient_id===dp.id):[];
      const tenantOpenWOs=tenantWOs.filter(w=>w.stage<9);
      const tenantOpenPay=tenantPayments.filter(p=>p.status!=="paid"&&p.status!=="cancelled");

      return <SlidePanel title={`<em>${dp.name}</em>`} sub={dp.roles.join(", ")} onClose={()=>setDetail(null)}>
        <div style={{padding:24}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,var(--forest-dark),var(--forest))",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-display)",fontSize:24,fontWeight:700,color:"white",margin:"0 auto 12px",boxShadow:"0 8px 24px rgba(0,83,87,.18)"}}>{initials(dp.name)}</div>
            <div style={{fontSize:20,fontWeight:700,fontFamily:"var(--font-display)"}}>{dp.name}</div>
            {dp.company_name&&<div style={{fontSize:13,color:"var(--text-muted)",marginTop:2}}>{dp.company_name}</div>}
            {type==="contractor"&&reviews.length>0&&<div style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:8,padding:"4px 12px",background:"var(--warning-bg)",borderRadius:100,border:"1px solid var(--warning-border)"}}>{Array(5).fill(0).map((_,i)=><span key={i} style={{color:i<Math.round(avgRating)?"var(--warning)":"var(--sand-dark)",fontSize:13}}>★</span>)}<span style={{fontSize:12,fontWeight:700,marginLeft:4,color:"var(--warning)"}}>{avgRating.toFixed(1)}</span><span style={{fontSize:11,color:"var(--text-muted)"}}>({reviews.length})</span></div>}
          </div>

          {/* Quick stats grid */}
          {type==="contractor"&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
            <div style={{padding:"12px 10px",background:"var(--forest-mist)",borderRadius:12,textAlign:"center"}}><div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:"var(--forest)"}}>{activeJobs.length}</div><div style={{fontSize:10,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>Active</div></div>
            <div style={{padding:"12px 10px",background:"var(--success-bg)",borderRadius:12,textAlign:"center"}}><div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:"var(--success)"}}>{completedJobs.length}</div><div style={{fontSize:10,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>Completed</div></div>
            <div style={{padding:"12px 10px",background:"var(--blue-mist)",borderRadius:12,textAlign:"center"}}><div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:"#1a6b7a"}}>${totalEarnings.toFixed(0)}</div><div style={{fontSize:10,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>Earnings</div></div>
          </div>}

          {type==="tenant"&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:20}}>
            <div style={{padding:"12px 10px",background:"var(--warning-bg)",borderRadius:12,textAlign:"center"}}><div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:"var(--warning)"}}>{tenantOpenWOs.length}</div><div style={{fontSize:10,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>Open Requests</div></div>
            <div style={{padding:"12px 10px",background:"var(--error-bg)",borderRadius:12,textAlign:"center"}}><div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:"var(--error)"}}>${tenantOpenPay.reduce((s,p)=>s+(+p.amount||0),0).toFixed(0)}</div><div style={{fontSize:10,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>Outstanding</div></div>
          </div>}

          {/* Contact info */}
          <div className="sec-label">Contact Information</div>
          <div className="detail-grid" style={{marginBottom:20}}>
            <div className="dg-row"><span>Email</span><strong style={{color:"var(--forest)"}}>{dp.email}</strong></div>
            <div className="dg-row"><span>Phone</span><strong>{dp.phone||"—"}</strong></div>
            {dp.trade&&<div className="dg-row"><span>Trade</span><strong>{dp.trade}</strong></div>}
            {dp.license_number&&<div className="dg-row"><span>License</span><strong>{dp.license_number}</strong></div>}
            {prop&&<div className="dg-row"><span>Property</span><strong>{prop.address}</strong></div>}
          </div>

          {/* Contractor: Active Jobs */}
          {type==="contractor"&&activeJobs.length>0&&<div style={{marginBottom:20}}>
            <div className="sec-label">Active Jobs ({activeJobs.length})</div>
            {activeJobs.map(wo=>{const p=data.properties.find(pr=>pr.id===wo.property_id);const st=getStage(wo.stage);return <div key={wo.id} className="list-row" style={{padding:"10px 12px",border:"1px solid rgba(0,83,87,.08)",borderRadius:12,marginBottom:6,gap:10,cursor:"pointer"}} onClick={()=>{setDetail(null);navigate("workorders",{detail:wo.id});}}>
              <div className={`pri-bar pri-${wo.priority}`} style={{height:32}}/>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{wo.wo_number} — {wo.title}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>{p?.address}</div></div>
              <Badge c={stageBadge(wo.stage)}>{st.label}</Badge>
            </div>;})}
          </div>}

          {/* Contractor: Recent Expenses */}
          {type==="contractor"&&contractorExpenses.length>0&&<div style={{marginBottom:20}}>
            <div className="sec-label">Recent Expenses ({contractorExpenses.length})</div>
            {contractorExpenses.slice(0,5).map(ex=><div key={ex.id} className="expense-row" style={{cursor:"pointer"}} onClick={()=>{setDetail(null);navigate("expenses",{contractor_id:dp.id});}}>
              <div className="expense-icon">{ex.payment_type==="company_card"?"💳":"💵"}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{ex.description}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>{new Date(ex.created_at).toLocaleDateString()} · {ex.payment_type==="company_card"?"Company":"Personal"}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontFamily:"var(--font-display)",fontSize:15,fontWeight:700}}>${(+ex.amount).toFixed(2)}</div><Badge c={ex.status==="approved"?"b-green":"b-amber"}>{ex.status}</Badge></div>
            </div>)}
          </div>}

          {/* Contractor: Reviews */}
          {type==="contractor"&&<div style={{marginBottom:20}}>
            <div className="sec-label">Reviews ({reviews.length})</div>
            {reviews.length===0&&<div style={{padding:"16px 14px",textAlign:"center",background:"var(--beige)",borderRadius:12,fontSize:13,color:"var(--text-muted)"}}>No reviews yet</div>}
            {reviews.map(r=><div key={r.id} style={{padding:"12px 14px",background:"var(--beige)",borderRadius:12,marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:6}}>{Array(5).fill(0).map((_,i)=><span key={i} style={{color:i<r.stars?"var(--warning)":"var(--sand-dark)",fontSize:14}}>★</span>)}<span style={{fontSize:11,color:"var(--text-muted)",marginLeft:8}}>{r.location_label}</span></div>
              <div style={{fontSize:13,lineHeight:1.5,color:"var(--text-body)"}}>{r.text}</div>
            </div>)}
          </div>}

          {/* Tenant: Recent Requests */}
          {type==="tenant"&&tenantWOs.length>0&&<div style={{marginBottom:20}}>
            <div className="sec-label">Maintenance Requests ({tenantWOs.length})</div>
            {tenantWOs.slice(0,5).map(wo=>{const st=getStage(wo.stage);return <div key={wo.id} className="list-row" style={{padding:"10px 12px",border:"1px solid rgba(0,83,87,.08)",borderRadius:12,marginBottom:6,gap:10,cursor:"pointer"}} onClick={()=>{setDetail(null);navigate("workorders",{detail:wo.id});}}>
              <div className={`pri-bar pri-${wo.priority}`} style={{height:32}}/>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{wo.wo_number} — {wo.title}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>{daysAgo(wo.created_at)}</div></div>
              <Badge c={stageBadge(wo.stage)}>{st.label}</Badge>
            </div>;})}
          </div>}

          {/* Tenant: Payment History */}
          {type==="tenant"&&tenantPayments.length>0&&<div style={{marginBottom:20}}>
            <div className="sec-label">Payment History ({tenantPayments.length})</div>
            {tenantPayments.slice(0,5).map(pay=><div key={pay.id} className="list-row" style={{padding:"10px 12px",border:"1px solid rgba(0,83,87,.08)",borderRadius:12,marginBottom:6,gap:10,cursor:"pointer"}} onClick={()=>{setDetail(null);navigate("payments",{detail:pay.id});}}>
              <div style={{width:34,height:34,borderRadius:10,background:pay.status==="paid"?"var(--success-bg)":pay.status==="overdue"?"var(--error-bg)":"var(--warning-bg)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{pay.type==="rent"?"🏠":"💰"}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{pay.title||pay.note||"Payment"}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>Due: {pay.due_date} · {pay.type}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontFamily:"var(--font-display)",fontSize:15,fontWeight:700}}>${pay.amount}</div><Badge c={pay.status==="paid"?"b-green":pay.status==="overdue"?"b-red":"b-amber"}>{pay.status}</Badge></div>
            </div>)}
          </div>}
        </div>
      </SlidePanel>;
    })()}
  </AppShell>;
}

/* ═══════════════════════════════════════════
   CALENDAR PAGE (read-only)
   ═══════════════════════════════════════════ */
function CalendarPage() {
  const {user,activeRole,data,navigate}=useApp();
  const scheduled=data.workOrders.filter(w=>w.scheduled_date&&w.stage>=5&&w.stage<9).sort((a,b)=>a.scheduled_date.localeCompare(b.scheduled_date));
  const P=id=>data.properties.find(p=>p.id===id);
  const U=id=>data.users.find(u=>u.id===id);
  return <AppShell page="calendar">
    <div className="page-header"><div><div className="page-title"><em>Calendar</em></div><div className="page-sub">Scheduled maintenance visits — click any visit to open the work order</div></div></div>
    <div className="panel">{scheduled.length?scheduled.map(wo=>{const d=new Date(wo.scheduled_date);const months=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      return <div key={wo.id} className="list-row" onClick={()=>navigate("workorders",{detail:wo.id})}>
        <div className="cal-date"><div className="cal-mon">{months[d.getMonth()]}</div><div className="cal-day">{d.getDate()}</div></div>
        <div style={{flex:1,minWidth:0}}><div className="row-title">{wo.wo_number} — {wo.title}</div><div className="row-sub">{P(wo.property_id)?.address} · {wo.contractor_id?U(wo.contractor_id)?.name:"TBD"}</div></div>
        <div style={{fontSize:12,fontWeight:600,color:"var(--forest)"}}>{wo.scheduled_time||"TBD"}</div>
      </div>;
    }):<EmptyState icon="📅" text="No scheduled visits" sub="Work orders will appear here once scheduled"/>}</div>
  </AppShell>;
}

/* ═══════════════════════════════════════════
   REPORTS PAGE
   ═══════════════════════════════════════════ */
function ReportsPage() {
  const {user,activeRole,data,navigate}=useApp();
  const stats=useMemo(()=>{
    const wos = activeRole==="contractor" ? data.workOrders.filter(w=>w.contractor_id===user.id) :
                activeRole==="owner" ? data.workOrders.filter(w=>data.properties.some(p=>p.id===w.property_id&&p.owner_id===user.id)) :
                data.workOrders;
    const completed=wos.filter(w=>w.stage>=7);
    const closed=wos.filter(w=>w.stage===9);
    const open=wos.filter(w=>w.stage<7);
    const urgent=wos.filter(w=>w.priority==="urgent"&&w.stage<9);
    // By category
    const byCat={};
    wos.forEach(w=>{byCat[w.category]=(byCat[w.category]||0)+1;});
    const categories=Object.entries(byCat).map(([cat,count])=>({cat,count})).sort((a,b)=>b.count-a.count);
    // Top contractors by completed jobs
    const contractorPerf=data.users.filter(u=>u.roles.includes("contractor")).map(c=>{
      const myJobs=data.workOrders.filter(w=>w.contractor_id===c.id);
      const myDone=myJobs.filter(w=>w.stage>=7);
      const myReviews=data.reviews.filter(r=>r.contractor_id===c.id);
      const avg=myReviews.length?(myReviews.reduce((s,r)=>s+r.stars,0)/myReviews.length):0;
      return {contractor:c,total:myJobs.length,done:myDone.length,rate:myJobs.length?Math.round(myDone.length/myJobs.length*100):0,rating:avg,reviewCount:myReviews.length};
    }).filter(c=>c.total>0).sort((a,b)=>b.done-a.done);
    return {wos,completed,closed,open,urgent,categories,contractorPerf};
  },[data,user,activeRole]);

  const myReviews=activeRole==="contractor"?data.reviews.filter(r=>r.contractor_id===user.id):[];
  const myAvg=myReviews.length?(myReviews.reduce((s,r)=>s+r.stars,0)/myReviews.length):0;
  const catIcons={hvac:"❄️",plumbing:"🔧",electrical:"⚡",roofing:"🏠",appliances:"🔌",landscaping:"🌳",painting:"🎨",general:"🛠️"};

  return <AppShell page="reports">
    <div className="page-header"><div><div className="page-title"><em>Reports</em></div><div className="page-sub">{activeRole==="contractor"?"Your performance and reviews":activeRole==="owner"?"Insights across your portfolio":"Property and maintenance insights"}</div></div></div>

    <div className="stats-row" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
      <StatCard label="Total Work Orders" value={stats.wos.length} icon="📋"/>
      <StatCard label="Completed" value={stats.completed.length} color="var(--success)" icon="✅"/>
      <StatCard label="Completion Rate" value={stats.wos.length?Math.round(stats.completed.length/stats.wos.length*100)+"%":"—"} color="var(--forest)" icon="📊"/>
      <StatCard label="Urgent Open" value={stats.urgent.length} color={stats.urgent.length?"var(--error)":undefined} icon="🚨"/>
    </div>

    {/* Contractor performance leaderboard */}
    {(activeRole==="manager"||activeRole==="owner")&&stats.contractorPerf.length>0&&<div className="panel"><div className="panel-header"><div className="panel-title">Contractor <em>Performance</em></div><span style={{fontSize:11,color:"var(--text-muted)"}}>{stats.contractorPerf.length} active</span></div>
      {stats.contractorPerf.map(c=><div key={c.contractor.id} className="list-row" style={{gap:14}} onClick={()=>navigate("contractors",{detail:c.contractor.id})}>
        <div className="avatar-sm">{initials(c.contractor.name)}</div>
        <div style={{flex:1,minWidth:0}}>
          <div className="row-title">{c.contractor.name}</div>
          <div className="row-sub">{c.contractor.trade||c.contractor.company_name||"Contractor"}</div>
        </div>
        <div style={{textAlign:"center",minWidth:60}}>
          <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:"var(--forest)"}}>{c.done}/{c.total}</div>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>Jobs</div>
        </div>
        <div style={{textAlign:"center",minWidth:60}}>
          <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:c.rate>=70?"var(--success)":c.rate>=40?"var(--warning)":"var(--error)"}}>{c.rate}%</div>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>Rate</div>
        </div>
        {c.reviewCount>0&&<div style={{textAlign:"center",minWidth:54}}>
          <div style={{fontFamily:"var(--font-display)",fontSize:16,fontWeight:700,color:"var(--warning)"}}>★ {c.rating.toFixed(1)}</div>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--text-muted)"}}>{c.reviewCount} {c.reviewCount===1?"review":"reviews"}</div>
        </div>}
      </div>)}
    </div>}

    <div className="content-grid">
      <div>
        {/* By Category */}
        {stats.categories.length>0&&<div className="panel">
          <div className="panel-header"><div className="panel-title">Work Orders by <em>Category</em></div></div>
          <div style={{padding:"16px 24px 20px"}}>
            {stats.categories.map(({cat,count})=>{const max=stats.categories[0].count;const pct=Math.round(count/max*100);return <div key={cat} style={{padding:"6px 0",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18,width:24,textAlign:"center"}}>{catIcons[cat]||"📋"}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span style={{fontWeight:500,textTransform:"capitalize"}}>{cat}</span><strong>{count}</strong></div>
                <div style={{height:6,background:"var(--sand)",borderRadius:6,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:"var(--forest)",borderRadius:6,transition:"width .4s"}}/></div>
              </div>
            </div>;})}
          </div>
        </div>}
      </div>
      <div>
        {/* Reviews — contractor's own, or all reviews for manager */}
        <div className="panel"><div className="panel-header"><div className="panel-title">{activeRole==="contractor"?"My ":""}<em>Reviews</em></div>{activeRole==="contractor"&&myReviews.length>0&&<span className="badge b-amber">★ {myAvg.toFixed(1)}</span>}</div>
          {(activeRole==="contractor"?myReviews:data.reviews).length===0&&<EmptyState icon="⭐" text="No reviews yet" sub={activeRole==="contractor"?"Reviews appear after completed jobs":"Manager reviews of contractors will appear here"}/>}
          {(activeRole==="contractor"?myReviews:data.reviews).slice(0,5).map(r=>{const c=data.users.find(u=>u.id===r.contractor_id);return <div key={r.id} style={{padding:"14px 24px",borderBottom:"1px solid rgba(0,83,87,.06)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {activeRole!=="contractor"&&c&&<><div className="avatar-sm" style={{width:28,height:28,fontSize:11}}>{initials(c.name)}</div><span style={{fontSize:13,fontWeight:600}}>{c.name}</span></>}
                <div style={{display:"flex",gap:1}}>{Array(5).fill(0).map((_,i)=><span key={i} style={{color:i<r.stars?"var(--warning)":"var(--sand-dark)",fontSize:14}}>★</span>)}</div>
              </div>
              <span style={{fontSize:11,color:"var(--text-muted)"}}>{r.location_label}</span>
            </div>
            <div style={{fontSize:13,lineHeight:1.5,color:"var(--text-body)"}}>{r.text}</div>
          </div>;})}
        </div>
      </div>
    </div>
  </AppShell>;
}

/* ═══════════════════════════════════════════
   FINANCIALS PAGE
   ═══════════════════════════════════════════ */
function FinancialsPage() {
  const {user,activeRole,data,navigate}=useApp();
  const fin=useMemo(()=>{
    const scopePayments=activeRole==="owner"?data.payments.filter(p=>data.properties.some(pr=>pr.id===p.property_id&&pr.owner_id===user.id)):data.payments;
    const paid=scopePayments.filter(p=>p.status==="paid");
    const overdue=scopePayments.filter(p=>p.status==="overdue");
    const pending=scopePayments.filter(p=>p.status==="pending");
    const totalCollected=paid.reduce((s,p)=>s+(+p.amount||0),0);
    const totalOverdue=overdue.reduce((s,p)=>s+(+p.amount||0),0);
    const totalPending=pending.reduce((s,p)=>s+(+p.amount||0),0);
    // Expenses (outflow)
    const scopeExpenses=activeRole==="owner"?(data.expenses||[]).filter(e=>data.properties.some(pr=>pr.id===e.property_id&&pr.owner_id===user.id)):(data.expenses||[]);
    const totalSpent=scopeExpenses.reduce((s,e)=>s+(+e.amount||0),0);
    const netCash=totalCollected-totalSpent;
    // By payment type
    const byType={};
    scopePayments.forEach(p=>{byType[p.type]=(byType[p.type]||0)+(+p.amount||0);});
    const types=Object.entries(byType).map(([k,v])=>({type:k,total:v})).sort((a,b)=>b.total-a.total);
    return {scopePayments,paid,overdue,pending,totalCollected,totalOverdue,totalPending,totalSpent,netCash,types};
  },[user,activeRole,data]);

  const typeIcon={rent:"🏠",deposit:"🔒",maintenance:"🔧",management_fee:"💼",late_fee:"⚠️",other:"💰"};
  const typeLabel={rent:"Rent",deposit:"Security Deposits",maintenance:"Maintenance",management_fee:"Management Fees",late_fee:"Late Fees",other:"Other"};

  return <AppShell page="financials">
    <div className="page-header"><div><div className="page-title"><em>Financials</em></div><div className="page-sub">{activeRole==="owner"?"Revenue and expenses across your portfolio":"Revenue, expenses, and cash position"}</div></div></div>

    <div className="stats-row" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
      <StatCard label="Collected" value={`$${fin.totalCollected.toLocaleString()}`} color="var(--success)" icon="💰" sub={`${fin.paid.length} paid`}/>
      <StatCard label="Outstanding" value={`$${(fin.totalPending+fin.totalOverdue).toLocaleString()}`} color={fin.totalOverdue?"var(--error)":"var(--warning)"} icon="⏳" sub={fin.totalOverdue?`$${fin.totalOverdue.toLocaleString()} overdue`:`${fin.pending.length} pending`}/>
      <StatCard label="Maintenance Spend" value={`$${fin.totalSpent.toLocaleString()}`} color="var(--blue)" icon="🔧"/>
      <StatCard label="Net Cash Flow" value={`${fin.netCash>=0?"+":"-"}$${Math.abs(fin.netCash).toLocaleString()}`} color={fin.netCash>=0?"var(--success)":"var(--error)"} icon="📊"/>
    </div>

    <div className="content-grid">
      <div>
        {/* Payment History */}
        <div className="panel"><div className="panel-header"><div className="panel-title">Payment <em>History</em></div><span className="panel-action" onClick={()=>navigate("payments")}>Manage →</span></div>
          {fin.scopePayments.length===0&&<EmptyState icon="💰" text="No payments yet" sub="Payments will appear here as they're created"/>}
          {fin.scopePayments.slice(0,8).map(p=>{const prop=data.properties.find(pr=>pr.id===p.property_id);return <div key={p.id} className="list-row" onClick={()=>navigate("payments",{detail:p.id})}>
            <div style={{width:38,height:38,borderRadius:10,background:p.status==="paid"?"var(--success-bg)":p.status==="overdue"?"var(--error-bg)":"var(--warning-bg)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{typeIcon[p.type]||"💰"}</div>
            <div style={{flex:1,minWidth:0}}><div className="row-title">{p.title||p.note||"Payment"}</div><div className="row-sub">{prop?.address||"—"} · Due {p.due_date} · {p.type}</div></div>
            <div style={{textAlign:"right",flexShrink:0}}><div style={{fontFamily:"var(--font-display)",fontSize:16,fontWeight:700,color:p.status==="paid"?"var(--success)":"var(--text-body)"}}>${p.amount.toLocaleString()}</div><Badge c={p.status==="paid"?"b-green":p.status==="overdue"?"b-red":"b-amber"}>{p.status}</Badge></div>
          </div>;})}
        </div>
      </div>
      <div>
        {/* Revenue by Type */}
        {fin.types.length>0&&<div className="panel"><div className="panel-header"><div className="panel-title">Revenue by <em>Type</em></div></div>
          <div style={{padding:"16px 20px 20px"}}>
            {fin.types.map(({type,total})=>{const max=fin.types[0].total;const pct=Math.round(total/max*100);return <div key={type} style={{padding:"6px 0",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18,width:24,textAlign:"center"}}>{typeIcon[type]||"💰"}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4,gap:8}}><span style={{fontWeight:500}}>{typeLabel[type]||type}</span><strong>${total.toLocaleString()}</strong></div>
                <div style={{height:5,background:"var(--sand)",borderRadius:5,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:"var(--forest)",borderRadius:5,transition:"width .4s"}}/></div>
              </div>
            </div>;})}
          </div>
        </div>}

        {/* Quick links */}
        <div className="panel"><div className="panel-header"><div className="panel-title">Quick <em>Actions</em></div></div>
          <div style={{padding:"14px 20px 18px",display:"flex",flexDirection:"column",gap:8}}>
            <button className="btn-sm ghost" style={{justifyContent:"flex-start",padding:"10px 14px"}} onClick={()=>navigate("payments")}>{icons.pay} View all payments</button>
            <button className="btn-sm ghost" style={{justifyContent:"flex-start",padding:"10px 14px"}} onClick={()=>navigate("expenses")}>{icons.receipt} View all expenses</button>
            <button className="btn-sm ghost" style={{justifyContent:"flex-start",padding:"10px 14px"}} onClick={()=>navigate("reports")}>{icons.report} Open reports</button>
          </div>
        </div>
      </div>
    </div>
  </AppShell>;
}

/* ═══════════════════════════════════════════
   EXPENSES PAGE — Manager Review & Approval (Module 3)
   ═══════════════════════════════════════════ */
function ExpensesPage() {
  const {user,activeRole,data,setExpenseStatus,deleteExpense,navigate,params}=useApp();
  const [statusFilter,setStatusFilter]=useState(()=>params?.status||"all");
  const [propertyFilter,setPropertyFilter]=useState(()=>params?.property_id||"all");
  const [contractorFilter,setContractorFilter]=useState(()=>params?.contractor_id||"all");
  const [search,setSearch]=useState("");
  const [previewReceipt,setPreviewReceipt]=useState(null);

  const expenses=data.expenses||[];
  const U=id=>data.users.find(u=>u.id===id);
  const P=id=>data.properties.find(p=>p.id===id);
  const W=id=>data.workOrders.find(w=>w.id===id);

  // Role-scoped expense list
  const myExpenses=useMemo(()=>{
    let list=expenses;
    if(activeRole==="contractor") list=list.filter(e=>e.contractor_id===user.id);
    else if(activeRole==="owner") {
      const myPropIds=data.properties.filter(p=>p.owner_id===user.id).map(p=>p.id);
      list=list.filter(e=>myPropIds.includes(e.property_id));
    }
    if(statusFilter!=="all") list=list.filter(e=>e.status===statusFilter);
    if(propertyFilter!=="all") list=list.filter(e=>e.property_id===propertyFilter);
    if(contractorFilter!=="all") list=list.filter(e=>e.contractor_id===contractorFilter);
    if(search.trim()){const s=search.toLowerCase();list=list.filter(e=>e.description.toLowerCase().includes(s)||(W(e.work_order_id)?.wo_number||"").toLowerCase().includes(s)||(P(e.property_id)?.address||"").toLowerCase().includes(s));}
    return list.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  },[expenses,activeRole,user,statusFilter,propertyFilter,contractorFilter,search,data]);

  const totals={
    all:myExpenses.reduce((s,e)=>s+(+e.amount||0),0),
    pending:myExpenses.filter(e=>e.status==="pending").reduce((s,e)=>s+(+e.amount||0),0),
    approved:myExpenses.filter(e=>e.status==="approved").reduce((s,e)=>s+(+e.amount||0),0),
  };
  const properties=activeRole==="owner"?data.properties.filter(p=>p.owner_id===user.id):data.properties.filter(p=>p.manager_id===user.id||activeRole==="contractor");
  const contractors=data.users.filter(u=>u.roles?.includes("contractor"));

  // Trends: spending grouped by month (last 6) and by work order category
  const trends=useMemo(()=>{
    const now=new Date();
    const months=[];
    for(let i=5;i>=0;i--){
      const d=new Date(now.getFullYear(),now.getMonth()-i,1);
      months.push({key:`${d.getFullYear()}-${d.getMonth()}`,label:d.toLocaleString('en',{month:'short'}),total:0});
    }
    // Use full unfiltered scope for trends (so filters don't blank the chart)
    const scope=activeRole==="contractor"?expenses.filter(e=>e.contractor_id===user.id):activeRole==="owner"?expenses.filter(e=>data.properties.some(p=>p.owner_id===user.id&&p.id===e.property_id)):expenses;
    scope.forEach(e=>{
      const d=new Date(e.created_at);
      const key=`${d.getFullYear()}-${d.getMonth()}`;
      const m=months.find(mo=>mo.key===key);
      if(m) m.total+=(+e.amount||0);
    });
    // Category breakdown via work order category
    const catMap={};
    scope.forEach(e=>{
      const wo=data.workOrders.find(w=>w.id===e.work_order_id);
      const cat=wo?.category||"other";
      catMap[cat]=(catMap[cat]||0)+(+e.amount||0);
    });
    const categories=Object.entries(catMap).map(([cat,total])=>({cat,total})).sort((a,b)=>b.total-a.total).slice(0,5);
    const maxMonth=Math.max(...months.map(m=>m.total),1);
    return {months,categories,maxMonth,scopeTotal:scope.reduce((s,e)=>s+(+e.amount||0),0)};
  },[expenses,activeRole,user,data.workOrders,data.properties]);

  return <AppShell page="expenses">
    <div className="page-header"><div><div className="page-title">Track <em>Expenses</em></div><div className="page-sub">{activeRole==="contractor"?"Your logged job expenses":activeRole==="owner"?"Spending across your properties":"Review and approve maintenance spending"}</div></div></div>

    <div className="stats-row" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
      <StatCard label="Total Expenses" value={`$${totals.all.toFixed(2)}`} icon="💼" onClick={()=>setStatusFilter("all")}/>
      <StatCard label="Pending Review" value={`$${totals.pending.toFixed(2)}`} color={totals.pending?"var(--warning)":undefined} icon="⏳" onClick={()=>setStatusFilter("pending")}/>
      <StatCard label="Approved" value={`$${totals.approved.toFixed(2)}`} color="var(--success)" icon="✓" onClick={()=>setStatusFilter("approved")}/>
      <StatCard label="Records" value={myExpenses.length} icon="📋"/>
    </div>

    {/* Trends & Breakdown (Day 28) */}
    {trends.scopeTotal>0&&<div className="trends-grid">
      <div className="panel" style={{margin:0}}>
        <div className="panel-header"><div className="panel-title">Monthly <em>Spending</em></div><span style={{fontSize:11,color:"var(--text-muted)"}}>Last 6 months</span></div>
        <div style={{padding:"16px 20px 20px"}}>
          <div className="trend-bars">
            {trends.months.map(m=>{const pct=Math.round(m.total/trends.maxMonth*100);return <div key={m.key} className="trend-bar-col">
              <div className="trend-bar-val">{m.total>0?`$${m.total<1000?m.total.toFixed(0):(m.total/1000).toFixed(1)+"k"}`:""}</div>
              <div className={`trend-bar${m.total===0?" empty":""}`} style={{height:`${Math.max(pct,m.total>0?6:2)}%`}}/>
              <div className="trend-bar-label">{m.label}</div>
            </div>;})}
          </div>
        </div>
      </div>
      <div className="panel" style={{margin:0}}>
        <div className="panel-header"><div className="panel-title">By <em>Category</em></div><span style={{fontSize:11,color:"var(--text-muted)"}}>Top 5</span></div>
        <div style={{padding:"16px 20px 20px"}}>
          {trends.categories.length===0&&<div style={{fontSize:13,color:"var(--text-muted)",textAlign:"center",padding:"16px 0"}}>No category data yet</div>}
          {trends.categories.map(({cat,total})=>{const pct=Math.round(total/(trends.categories[0].total||1)*100);const icons={hvac:"❄️",plumbing:"🔧",electrical:"⚡",roofing:"🏠",appliances:"🔌",landscaping:"🌳",painting:"🎨",general:"🛠️",other:"📋"};return <div key={cat} style={{padding:"6px 0",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>{icons[cat]||"📋"}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4,gap:8}}><span style={{fontWeight:500,textTransform:"capitalize"}}>{cat}</span><strong style={{flexShrink:0}}>${total.toFixed(0)}</strong></div>
              <div style={{height:5,background:"var(--sand)",borderRadius:5,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:"var(--forest)",borderRadius:5,transition:"width .4s"}}/></div>
            </div>
          </div>;})}
        </div>
      </div>
    </div>}

    <div className="filter-bar" style={{flexWrap:"wrap",gap:8}}>
      {[["all","All"],["pending","Pending"],["approved","Approved"]].map(([k,l])=><div key={k} className={`ftab${statusFilter===k?" active":""}`} onClick={()=>setStatusFilter(k)}>{l}</div>)}
      <select className="filter-search" style={{padding:"8px 12px",minWidth:160}} value={propertyFilter} onChange={e=>setPropertyFilter(e.target.value)}>
        <option value="all">All properties</option>
        {properties.map(p=><option key={p.id} value={p.id}>{p.address}</option>)}
      </select>
      {activeRole!=="contractor"&&<select className="filter-search" style={{padding:"8px 12px",minWidth:160}} value={contractorFilter} onChange={e=>setContractorFilter(e.target.value)}>
        <option value="all">All contractors</option>
        {contractors.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select>}
      <div style={{position:"relative",marginLeft:"auto"}}><span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",opacity:.4}}>{icons.search}</span><input className="filter-search" placeholder="Search expenses…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    </div>

    <div className="panel">
      {!myExpenses.length&&<EmptyState icon="💼" text="No expenses found" sub={activeRole==="contractor"?"Log expenses against your work orders":"Expenses will appear here as they're submitted"}/>}
      {myExpenses.map(ex=>{
        const wo=W(ex.work_order_id); const prop=P(ex.property_id); const con=U(ex.contractor_id);
        return <div key={ex.id} className="list-row" style={{padding:"14px 24px"}}>
          <div className="expense-icon" style={{width:42,height:42}}>{ex.payment_type==="company_card"?"💳":"💵"}</div>
          <div style={{flex:1,minWidth:0}}>
            <div className="row-title">{ex.description}</div>
            <div className="row-sub">
              {wo&&<span style={{color:"var(--forest)",cursor:"pointer",fontWeight:500}} onClick={()=>navigate("workorders",{detail:wo.id})}>{wo.wo_number}</span>}
              {wo&&prop&&" · "}{prop?.address}{con&&` · ${con.name}`} · {new Date(ex.created_at).toLocaleDateString()}
              {ex.receipt_url&&<span style={{marginLeft:6,color:"var(--forest)",cursor:"pointer",fontWeight:600}} onClick={()=>setPreviewReceipt(ex)}> · 📎 Receipt</span>}
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700}}>${(+ex.amount).toFixed(2)}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".06em"}}>{ex.payment_type==="company_card"?"Company":"Personal"}</div>
          </div>
          <Badge c={ex.status==="approved"?"b-green":"b-amber"}>{ex.status}</Badge>
          {activeRole==="manager"&&ex.status==="pending"&&<button className="btn-sm" style={{background:"var(--success)",color:"white",padding:"6px 12px",fontSize:11}} onClick={()=>setExpenseStatus(ex.id,'approved')}>Approve</button>}
          {activeRole==="manager"&&ex.status==="approved"&&<button className="btn-sm ghost" style={{padding:"6px 10px",fontSize:11}} onClick={()=>setExpenseStatus(ex.id,'pending')}>Revert</button>}
        </div>;
      })}
    </div>

    {previewReceipt&&<Modal title="Receipt <em>Preview</em>" sub={previewReceipt.description} onClose={()=>setPreviewReceipt(null)} wide>
      <div style={{textAlign:"center"}}>
        {previewReceipt.receipt_url?(previewReceipt.receipt_url.startsWith("data:image")?<img src={previewReceipt.receipt_url} alt="receipt" style={{maxWidth:"100%",maxHeight:"60vh",borderRadius:12}}/>:<div style={{padding:48,background:"var(--beige)",borderRadius:12}}><div style={{fontSize:48,marginBottom:12}}>📄</div><div style={{fontSize:14,fontWeight:600,marginBottom:6}}>{previewReceipt.receipt_name||"Receipt"}</div><a href={previewReceipt.receipt_url} download={previewReceipt.receipt_name||"receipt"} className="btn-sm primary" style={{padding:"6px 14px",fontSize:12,display:"inline-block",marginTop:8}}>Download</a></div>):<div style={{padding:48,color:"var(--text-muted)"}}>No receipt attached</div>}
        <div style={{marginTop:16,fontSize:13,color:"var(--text-muted)"}}>Amount: <strong style={{color:"var(--text-body)"}}>${(+previewReceipt.amount).toFixed(2)}</strong></div>
      </div>
    </Modal>}
  </AppShell>;
}

/* ═══════════════════════════════════════════
   ACCOUNT PAGE
   ═══════════════════════════════════════════ */
function AccountPage() {
  const {user,data,toast,updateProfile}=useApp();
  const [f,setF]=useState({name:user.name,email:user.email,phone:user.phone||"",company_name:user.company_name||""});
  const save=async ()=>{
    const updated={...user,...f};
    await updateProfile(updated);
  };
  return <AppShell page="account">
    <div className="page-header"><div><div className="page-title">My <em>Account</em></div><div className="page-sub">Manage your profile and preferences</div></div></div>
    <div style={{maxWidth:560}}>
      <div className="panel" style={{padding:28}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,var(--blue),var(--forest-mid))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"white",fontFamily:"var(--font-display)"}}>{initials(user.name)}</div>
          <div><div style={{fontSize:18,fontWeight:700}}>{user.name}</div><div style={{fontSize:13,color:"var(--text-muted)"}}>{user.roles.map(r=>r.charAt(0).toUpperCase()+r.slice(1)).join(" · ")}</div></div>
        </div>
        <Field label="Full Name"><input className="fi no-icon" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field>
        <Field label="Email"><input className="fi no-icon" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></Field>
        <Field label="Phone"><input className="fi no-icon" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></Field>
        <Field label="Company / Organization"><input className="fi no-icon" value={f.company_name} onChange={e=>setF({...f,company_name:e.target.value})}/></Field>
        <button className="btn-primary" style={{marginTop:16}} onClick={save}>Save Changes</button>
      </div>
    </div>
  </AppShell>;
}

/* ═══════════════════════════════════════════
   INVITE PAGE
   ═══════════════════════════════════════════ */
function InvitePage({type}) {
  const {data,setData,toast,navigate}=useApp();
  const [f,setF]=useState({name:"",email:"",property_id:"",trade:""});
  const [sent,setSent]=useState(false);
  const labels={tenant:{title:"Invite <em>Tenant</em>",sub:"Generate a join code for a new tenant"},owner:{title:"Invite <em>Owner</em>",sub:"Send a connection request to a property owner"},contractor:{title:"Invite <em>Contractor</em>",sub:"Recruit a contractor to your network"}};
  const send=()=>{
    if(!f.name||!f.email) return;
    const code="TT-"+Math.random().toString(36).substr(2,4).toUpperCase()+"-"+Math.random().toString(36).substr(2,4).toUpperCase();
    toast(`Invite sent to ${f.email} — Code: ${code}`); setSent(true);
  };
  return <AppShell page="invite">
    <div className="page-header"><div><div className="page-title" dangerouslySetInnerHTML={{__html:labels[type]?.title}}/><div className="page-sub">{labels[type]?.sub}</div></div></div>
    <div style={{maxWidth:480}}>
      <div className="panel" style={{padding:28}}>
        {!sent?<>
          <Field label="Recipient Name"><input className="fi no-icon" value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Full name"/></Field>
          <Field label="Email Address"><input className="fi no-icon" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="email@example.com"/></Field>
          {type==="tenant"&&<Field label="Property"><select className="fi no-icon sel" value={f.property_id} onChange={e=>setF({...f,property_id:e.target.value})}><option value="">Select property…</option>{data.properties.map(p=><option key={p.id} value={p.id}>{p.address}</option>)}</select></Field>}
          {type==="contractor"&&<Field label="Trade Specialty"><input className="fi no-icon" value={f.trade} onChange={e=>setF({...f,trade:e.target.value})} placeholder="e.g. Plumbing, HVAC, Electrical"/></Field>}
          <button className="btn-primary" style={{marginTop:12}} onClick={send}>Send Invitation</button>
        </>:<div style={{textAlign:"center",padding:"24px 0"}}>
          <div style={{fontSize:48,marginBottom:16}}>✅</div>
          <div style={{fontSize:18,fontWeight:700,fontFamily:"var(--font-display)",marginBottom:8}}>Invitation Sent!</div>
          <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>An email has been sent to {f.email}</div>
          <button className="btn-sm primary" onClick={()=>{setSent(false);setF({name:"",email:"",property_id:"",trade:""});}}>Send Another</button>
        </div>}
      </div>
    </div>
  </AppShell>;
}

/* ═══════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════ */
function Landing() {
  const {navigate}=useApp();
  return <div style={{minHeight:"100vh",background:"var(--beige)"}}>
    <div className="auth-bg"><div className="bg-dots"/><div className="bg-arch arch-1"/><div className="bg-arch arch-2"/></div>
    <nav className="auth-nav"><span className="logo-link">TropicTask</span><div style={{display:"flex",gap:12,alignItems:"center"}}><a onClick={()=>navigate("signin")} className="nav-link">Sign in</a><button className="btn-sm primary" onClick={()=>navigate("signup")}>Get Started Free</button></div></nav>
    <main style={{position:"relative",zIndex:1,maxWidth:800,margin:"0 auto",padding:"100px 24px",textAlign:"center"}}>
      <h1 style={{fontFamily:"var(--font-display)",fontSize:52,fontWeight:700,lineHeight:1.1,marginBottom:20}}>Property management, <em style={{fontStyle:"italic",color:"var(--forest)"}}>simplified</em></h1>
      <p style={{fontSize:18,color:"var(--text-muted)",fontWeight:300,lineHeight:1.7,maxWidth:560,margin:"0 auto 40px"}}>Manage properties, coordinate maintenance, track payments, and keep everyone in sync — one platform for managers, owners, tenants, and contractors.</p>
      <div style={{display:"flex",gap:14,justifyContent:"center"}}><button className="btn-sm primary" style={{padding:"15px 32px",fontSize:16}} onClick={()=>navigate("signup")}>Start for free →</button><button className="btn-sm ghost" style={{padding:"15px 32px",fontSize:16}} onClick={()=>navigate("signin")}>Sign in</button></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20,marginTop:80}}>
        {[{i:"🏠",t:"Properties",d:"Centralized tracking for all properties, components, and maintenance history."},{i:"🔧",t:"9-Stage Work Orders",d:"Full lifecycle from submission to close — with owner approvals and contractor tracking."},{i:"💰",t:"Payments",d:"Coordinate rent, deposits, and maintenance fees. One-time and recurring."}].map(f=><div key={f.t} className="landing-card"><div style={{fontSize:32,marginBottom:16}}>{f.i}</div><div className="landing-card-title">{f.t}</div><div style={{fontSize:14,color:"var(--text-muted)",lineHeight:1.6}}>{f.d}</div></div>)}
      </div>
    </main>
  </div>;
}

/* ═══════════════════════════════════════════
   MAIN APP + ROUTER + CSS
   ═══════════════════════════════════════════ */

export default function App() {
  const [page,setPage]=useState("landing");
  const [user,setUser]=useState(null);
  const [activeRole,setActiveRole]=useState(null);
  const [data,setDataState]=useState(null);
  const [toastMsg,setToast]=useState(null);
  const [loading,setLoading]=useState(true);
  const [isRemote,setIsRemote]=useState(false);
  const pageParams=useRef({});

  // Fetch all data from Supabase for authenticated user
  const loadRemoteData = useCallback(async (userId) => {
    // Wrap each fetch so one failure doesn't block others
    const safe = (fn) => fn.catch(() => []);
    const [users, properties, workOrders, payments, components, reviews] = await Promise.all([
      safe(fetchProfiles()),
      safe(fetchAllUserProperties(userId)),
      safe(fetchWorkOrders()),
      safe(fetchPayments()),
      safe(fetchComponents()),
      safe(fetchReviews()),
    ]);
    const remoteData = {
      users: users.length ? users : [],
      properties: properties.length ? properties : [],
      workOrders: workOrders.length ? workOrders : [],
      payments: payments.length ? payments : [],
      components: components.length ? components : [],
      reviews: reviews.length ? reviews : [],
      invites: [],
      _nextId: SEED._nextId,
    };
    setDataState(remoteData);
    saveStore(remoteData);
    return remoteData;
  }, []);

  useEffect(()=>{
    async function init() {
      if (isSupabaseConfigured()) {
        setIsRemote(true);
        try {
          const session = await getSupabaseSession();
          if (session?.user) {
            const profile = await fetchProfile(session.user.id);
            if (profile) {
              setUser(profile);
              setActiveRole(profile.roles?.[0] || 'manager');
              setPage('dashboard');
              await loadRemoteData(session.user.id);
              setLoading(false);
              return;
            }
          }
          // No session — show landing with seed data so demo login works
          const s = sanitizeStore(loadStore()) || SEED;
          setDataState(s);
        } catch {
          const s = sanitizeStore(loadStore()) || SEED;
          setDataState(s);
        } finally {
          setLoading(false);
        }
        return;
      }
      const s = sanitizeStore(loadStore()) || SEED;
      setDataState(s);
      setLoading(false);
    }
    init();
  }, [loadRemoteData]);

  const saveTimerRef = useRef(null);
  const setData = useCallback(nd => {
    setDataState(nd);
    // Debounce localStorage writes to keep typing/uploads snappy
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { saveStore(nd); }, 300);
  }, []);
  const navigate=useCallback((pg,params={})=>{pageParams.current=params;setPage(pg);window.scrollTo(0,0);},[]);
  const toast=useCallback(msg=>setToast(msg),[]);
  const logout=useCallback(async()=>{if(isRemote){await supabaseSignOut();}setUser(null);setActiveRole(null);setPage('signin');},[isRemote]);

  const createProperty = useCallback(async (property) => {
    if (isRemote) {
      const created = await supabaseCreateProperty(property);
      if (created) {
        setData({...data, properties:[...data.properties, created]});
        toast('Property added.');
        return created;
      }
    }
    const id = 'p'+data._nextId.p;
    const local = {...property, id, status:'vacant', created_at:new Date().toISOString()};
    setData({...data, properties:[...data.properties, local], _nextId:{...data._nextId,p:data._nextId.p+1}});
    toast('Property added.');
    return local;
  }, [isRemote, data, setData, toast]);

  const updatePropertyAction = useCallback(async (propertyId, updates) => {
    if (isRemote) {
      const updated = await supabaseUpdateProperty(propertyId, updates);
      if (updated) {
        setData({...data, properties:data.properties.map(p=>p.id===propertyId?updated:p)});
        toast('Property updated.');
        return updated;
      }
    }
    const updatedLocal = data.properties.map(p=>p.id===propertyId?{...p,...updates,updated_at:new Date().toISOString()}:p);
    setData({...data, properties:updatedLocal});
    toast('Property updated.');
    return updatedLocal.find(p=>p.id===propertyId);
  }, [isRemote, data, setData, toast]);

  const deletePropertyAction = useCallback(async (propertyId) => {
    if (isRemote) {
      const success = await supabaseDeleteProperty(propertyId);
      if (success) {
        setData({...data, properties:data.properties.filter(p=>p.id!==propertyId)});
        toast('Property deleted.');
        return true;
      }
      return false;
    }
    setData({...data, properties:data.properties.filter(p=>p.id!==propertyId)});
    toast('Property deleted.');
    return true;
  }, [isRemote, data, setData, toast]);

  const createWorkOrder = useCallback(async (wo) => {
    if (isRemote) {
      const created = await supabaseCreateWorkOrder(wo);
      if (created) {
        setData({...data, workOrders:[...data.workOrders, created]});
        toast('Work order created.');
        return created;
      }
    }
    const id = 'wo'+data._nextId.wo;
    const local = {...wo, id, wo_number:`WO-${1000+data._nextId.wo}`, created_at:new Date().toISOString()};
    setData({...data, workOrders:[...data.workOrders, local], _nextId:{...data._nextId,wo:data._nextId.wo+1}});
    toast('Work order created.');
    return local;
  }, [isRemote, data, setData, toast]);

  const setWorkOrderStage = useCallback(async (woId, newStage, override={}) => {
    if (isRemote) {
      const updated = await supabaseUpdateWorkOrderStage(woId, newStage, override);
      if (updated) {
        setData({...data, workOrders:data.workOrders.map(w=>w.id===woId?updated:w)});
        return updated;
      }
      toast('Warning: change may not have saved');
    }
    const updatedLocal = data.workOrders.map(w=>w.id===woId?{...w,stage:newStage,...override}:w);
    setData({...data, workOrders: updatedLocal});
    return updatedLocal.find(w=>w.id===woId);
  }, [isRemote, data, setData, toast]);

  const assignContractor = useCallback(async (woId, contractorId) => {
    const existing = data.workOrders.find(w=>w.id===woId);
    if (!existing) return;
    const nextStage = Math.max(existing.stage, 3);
    if (isRemote) {
      const updated = await supabaseUpdateWorkOrderStage(woId, nextStage, {contractor_id:contractorId});
      if (updated) {
        setData({...data, workOrders:data.workOrders.map(w=>w.id===woId?updated:w)}); return updated;
      }
      toast('Warning: change may not have saved');
    }
    const updatedLocal = data.workOrders.map(w=>w.id===woId?{...w, contractor_id:contractorId, stage:nextStage}:w);
    setData({...data, workOrders:updatedLocal});
    return updatedLocal.find(w=>w.id===woId);
  }, [isRemote, data, setData, toast]);

  const createPayment = useCallback(async (payment) => {
    if (isRemote) {
      const created = await supabaseCreatePayment(payment);
      if (created) {
        setData({...data, payments:[...data.payments, created]});
        toast('Payment request created.');
        return created;
      }
    }
    const id='pay'+data._nextId.pay;
    const local = {...payment, id, status:'pending', created_at:new Date().toISOString()};
    setData({...data, payments:[...data.payments, local], _nextId:{...data._nextId,pay:data._nextId.pay+1}});
    toast('Payment request created.');
    return local;
  }, [isRemote, data, setData, toast]);

  const markPaymentPaid = useCallback(async (paymentId) => {
    if(isRemote) {
      const updated = await supabaseUpdatePaymentStatus(paymentId, 'paid');
      if(updated) { setData({...data,payments:data.payments.map(p=>p.id===paymentId?updated:p)}); toast('Marked as paid.'); return updated; }
    }
    const updatedLocal = data.payments.map(p=>p.id===paymentId?{...p,status:'paid'}:p);
    setData({...data, payments: updatedLocal});
    toast('Marked as paid.');
    return updatedLocal.find(p=>p.id===paymentId);
  }, [isRemote,data,setData,toast]);

  const createExpense = useCallback(async (expense) => {
    const id = 'exp' + (data._nextId.exp || 1);
    const local = {
      ...expense,
      id,
      status: 'pending',
      created_at: new Date().toISOString(),
      approved_at: null,
      approved_by: null,
    };
    setData({
      ...data,
      expenses: [...(data.expenses || []), local],
      _nextId: { ...data._nextId, exp: (data._nextId.exp || 1) + 1 },
    });
    toast('Expense logged.');
    return local;
  }, [data, setData, toast]);

  const approveExpense = useCallback(async (expenseId) => {
    const updated = (data.expenses || []).map(e =>
      e.id === expenseId
        ? { ...e, status: 'approved', approved_at: new Date().toISOString(), approved_by: user.id }
        : e
    );
    setData({ ...data, expenses: updated });
    toast('Expense approved.');
    return updated.find(e => e.id === expenseId);
  }, [data, setData, toast, user]);

  const setExpenseStatus = useCallback(async (expenseId, status) => {
    const updated = (data.expenses || []).map(e =>
      e.id === expenseId
        ? {
            ...e,
            status,
            approved_at: status === 'approved' ? new Date().toISOString() : null,
            approved_by: status === 'approved' ? user.id : null,
          }
        : e
    );
    setData({ ...data, expenses: updated });
    toast(status === 'approved' ? 'Expense approved.' : 'Expense set to pending.');
    return updated.find(e => e.id === expenseId);
  }, [data, setData, toast, user]);

  const deleteExpense = useCallback(async (expenseId) => {
    setData({ ...data, expenses: (data.expenses || []).filter(e => e.id !== expenseId) });
    toast('Expense deleted.');
  }, [data, setData, toast]);

  const updateProfile = useCallback(async (profile) => {
    if (isRemote) {
      const updated = await supabaseUpdateProfile(profile.id, { name: profile.name, email: profile.email, phone: profile.phone, company_name: profile.company_name });
      if (updated) { setUser(updated); setData({...data, users:data.users.map(u=>u.id===updated.id?updated:u)}); toast('Profile updated.'); return updated; }
    }
    setUser(profile);
    setData({...data, users:data.users.map(u=>u.id===profile.id?profile:u)});
    toast('Profile updated.');
    return profile;
  }, [isRemote,data,setData,toast]);

  if(loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:"#005357",fontStyle:"italic"}}>TropicTask</span></div>;

  const ctx={user,setUser,activeRole,setActiveRole,data,setData,navigate,toast,logout,createProperty,updateProperty:updatePropertyAction,deleteProperty:deletePropertyAction,createWorkOrder,setWorkOrderStage,assignContractor,createPayment,markPaymentPaid,updateProfile,createExpense,approveExpense,setExpenseStatus,deleteExpense,isRemote,params:pageParams.current};
  const inviteType=pageParams.current?.type||"tenant";

  return <Ctx.Provider value={ctx}>
    {/* CSS loaded via globals.css import in main.jsx */}
    {page==="landing"&&<Landing/>}
    {page==="signin"&&<SignIn/>}
    {page==="signup"&&<SignUp/>}
    {page==="dashboard"&&<Dashboard/>}
    {page==="properties"&&<PropertiesPage/>}
    {page==="workorders"&&<WorkOrdersPage/>}
    {page==="payments"&&<PaymentsPage/>}
    {page==="contractors"&&<PeoplePage type="contractor"/>}
    {page==="tenants"&&<PeoplePage type="tenant"/>}
    {page==="calendar"&&<CalendarPage/>}
    {page==="reports"&&<ReportsPage/>}
    {page==="financials"&&<FinancialsPage/>}
    {page==="expenses"&&<ExpensesPage/>}
    {page==="account"&&<AccountPage/>}
    {page==="invite"&&<InvitePage type={inviteType}/>}
    {page==="documents"&&<AppShell page="documents"><div className="page-header"><div><div className="page-title"><em>Documents</em></div><div className="page-sub">Files shared by your property manager</div></div></div><div className="panel"><div className="panel-header"><div className="panel-title">My <em>Files</em></div><span className="badge b-forest">{4} documents</span></div>{[{n:"Lease Agreement",s:"142 KB",i:"📄",date:"Mar 1, 2025",type:"PDF"},{n:"Move-in Inspection Report",s:"88 KB",i:"📋",date:"Mar 5, 2025",type:"PDF"},{n:"Community Rules & Regulations",s:"54 KB",i:"📜",date:"Jan 15, 2025",type:"PDF"},{n:"Key & Access Code Info",s:"12 KB",i:"🔑",date:"Mar 1, 2025",type:"TXT"}].map(d=><div key={d.n} className="list-row"><span style={{fontSize:20}}>{d.i}</span><div style={{flex:1}}><div className="row-title">{d.n}</div><div className="row-sub">{d.type} · {d.s} · Shared {d.date}</div></div><button className="btn-sm ghost" style={{padding:"5px 12px",fontSize:11}} onClick={()=>ctx.toast(`"${d.n}" download started`)}>Download</button></div>)}</div></AppShell>}
    {toastMsg&&<Toast msg={toastMsg} onDone={()=>setToast(null)}/>}
  </Ctx.Provider>;
}