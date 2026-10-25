 "use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowDownUp, Bookmark, BriefcaseBusiness, Building2, Check, ChevronDown, ExternalLink, FileText, Filter, Globe2, RefreshCw, Search, Sparkles, Target, Upload, X } from "lucide-react";

type Job = {
  id: string; company: string; title: string; location: string; url: string;
  description: string; postedAt?: string; source: string; remote?: boolean;
};
type CareerLink = { name: string; url: string; category: string };
const careerLinks: CareerLink[] = [
  {name:"Google",url:"https://www.google.com/about/careers/applications/jobs/results/?q=product%20manager",category:"FAANG"},
  {name:"Meta",url:"https://www.metacareers.com/jobs/?q=product%20manager",category:"FAANG"},
  {name:"Amazon",url:"https://www.amazon.jobs/en/search?base_query=product+manager",category:"FAANG"},
  {name:"Apple",url:"https://jobs.apple.com/en-us/search?search=product%20manager",category:"FAANG"},
  {name:"Netflix",url:"https://jobs.netflix.com/search?q=product%20manager",category:"FAANG"},
  {name:"Microsoft",url:"https://careers.microsoft.com/v2/global/en/search?lc=United%20States&l=en_us&pg=1&pgSz=20&o=Relevance&flt=true&keywords=product%20manager",category:"Big Tech"},
  {name:"NVIDIA",url:"https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite?q=product%20manager",category:"Big Tech"},
  {name:"Uber",url:"https://www.uber.com/us/en/careers/list/?query=product%20manager",category:"Tech"},
  {name:"Airbnb",url:"https://careers.airbnb.com/positions/?_keywords=product%20manager",category:"Tech"},
  {name:"Stripe",url:"https://stripe.com/jobs/search?query=product%20manager",category:"Fintech"},
  {name:"OpenAI",url:"https://openai.com/careers/search/",category:"AI"},
  {name:"Anthropic",url:"https://www.anthropic.com/careers",category:"AI"},
  {name:"Coinbase",url:"https://www.coinbase.com/careers/positions",category:"Fintech"},
  {name:"Adobe",url:"https://careers.adobe.com/us/en/search-results?keywords=product%20manager",category:"Big Tech"},
  {name:"Salesforce",url:"https://careers.salesforce.com/en/jobs/?search=product%20manager",category:"Big Tech"}
];
const terms = ["product manager","product management","product lead","group product manager","principal product","director of product","product owner","product strategy","technical product manager","product operations"];
const skills = [
  {label:"Product strategy", words:["product strategy","roadmap","vision","north star","strategic","market opportunity"]},
  {label:"Discovery & research", words:["user research","customer research","discovery","customer interview","jobs to be done","jtbd","usability"]},
  {label:"Analytics & experimentation", words:["sql","analytics","a/b test","experimentation","metrics","kpi","funnel","cohort","retention","conversion"]},
  {label:"Execution & delivery", words:["agile","scrum","prioritization","backlog","stakeholder","cross-functional","launch","go-to-market","gtm"]},
  {label:"Technical & AI", words:["api","machine learning","ai","genai","generative ai","llm","platform","data science","technical"]},
  {label:"Business impact", words:["revenue","growth","monetization","profitability","p&l","pricing","business impact","adoption"]}
];
function cleanHtml(s: string) { return (s || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim(); }
function scoreJob(job: Job, resume: string) {
  if (!resume.trim()) return null;
  const r = resume.toLowerCase();
  const jd = `${job.title} ${job.description}`.toLowerCase();
  const matched = skills.map(s => ({...s, hit: s.words.some(w => r.includes(w)), inJd: s.words.some(w => jd.includes(w))}));
  const resumeTerms = new Set(r.match(/[a-z][a-z0-9+#.-]{2,}/g) || []);
  const jdTerms = new Set(jd.match(/[a-z][a-z0-9+#.-]{2,}/g) || []);
  const overlap = [...resumeTerms].filter(w => jdTerms.has(w)).length;
  const coverage = matched.filter(x => x.hit && x.inJd).length;
  const relevant = matched.filter(x => x.inJd).length;
  const keywordScore = Math.min(100, Math.round(overlap / Math.max(1, Math.min(45, jdTerms.size * .22)) * 100));
  const skillScore = relevant ? Math.round(coverage / relevant * 100) : 0;
  const score = Math.round(skillScore * .72 + keywordScore * .28);
  return {score, matched: matched.filter(x=>x.hit && x.inJd).map(x=>x.label), missing: matched.filter(x=>!x.hit && x.inJd).map(x=>x.label)};
}
function companyInitials(name:string) { return name.split(/[\s&.-]+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase(); }

export default function Home() {
  const [jobs,setJobs] = useState<Job[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [query,setQuery] = useState("");
  const [location,setLocation] = useState("All locations");
  const [company,setCompany] = useState("All companies");
  const [sort,setSort] = useState("match");
  const [resume,setResume] = useState("");
  const [saved,setSaved] = useState<string[]>([]);
  const [savedOnly,setSavedOnly] = useState(false);
  const [showResume,setShowResume] = useState(false);
  const [activeTab,setActiveTab] = useState<"roles"|"companies"|"saved">("roles");
  const [lastUpdated,setLastUpdated] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem("role-radar-saved") || "[]")); setResume(localStorage.getItem("role-radar-resume") || ""); } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem("role-radar-saved",JSON.stringify(saved)); } catch {} },[saved]);
  useEffect(() => { try { localStorage.setItem("role-radar-resume",resume); } catch {} },[resume]);

  async function loadJobs() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/jobs", {cache:"no-store"});
      if (!res.ok) throw new Error("The job feed could not be reached.");
      const data = await res.json();
      setJobs(data.jobs || []);
      setLastUpdated(new Date().toLocaleString());
      if (data.warning) setError(data.warning);
    } catch (e) {
      setError("Could not load live feeds. Use company career links below or retry.");
      setJobs([]);
    } finally { setLoading(false); }
  }
  useEffect(() => { loadJobs(); }, []);

  const companies = useMemo(() => ["All companies",...Array.from(new Set(jobs.map(j=>j.company))).sort()], [jobs]);
  const locations = useMemo(() => ["All locations",...Array.from(new Set(jobs.map(j=>j.location).filter(Boolean))).sort()], [jobs]);
  const ranked = useMemo(() => {
    const normalized = jobs.map(j=>({...j, match:scoreJob(j,resume)}));
    return normalized.filter(j => {
      const text = `${j.title} ${j.company} ${j.location} ${j.description}`.toLowerCase();
      const isPM = terms.some(t=>j.title.toLowerCase().includes(t)) || /product management|product manager/.test(j.description.slice(0,500).toLowerCase());
      return isPM && (!query || text.includes(query.toLowerCase())) && (location==="All locations" || j.location===location) && (company==="All companies" || j.company===company) && (!savedOnly || saved.includes(j.id)) && (activeTab!=="saved" || saved.includes(j.id));
    }).sort((a,b)=>sort==="match" ? (b.match?.score ?? -1)-(a.match?.score ?? -1) : sort==="company" ? a.company.localeCompare(b.company) : sort==="recent" ? (b.postedAt||"").localeCompare(a.postedAt||"") : a.title.localeCompare(b.title));
  },[jobs,resume,query,location,company,sort,savedOnly,saved,activeTab]);
  const toggleSaved=(id:string)=>setSaved(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  async function readResume(file?:File) {
    if (!file) return;
    if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) setResume(await file.text());
    else setError("For this starter version, paste your resume text or upload a .txt copy. PDF/DOCX parsing is not included.");
  }
  const savedCount=saved.length;
  const highFit=ranked.filter(j=>(j.match?.score||0)>=70).length;

  return <main className="shell">
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-mark"><Target size={21}/></span><span>role<span className="brand-light">radar</span><small>CAREER INTELLIGENCE</small></span></a>
      <div className="side-label">WORKSPACE</div>
      <button className={`nav-item ${activeTab==="roles"?"active":""}`} onClick={()=>setActiveTab("roles")}><BriefcaseBusiness size={17}/> Product roles <span className="nav-count">{jobs.length}</span></button>
      <button className={`nav-item ${activeTab==="saved"?"active":""}`} onClick={()=>setActiveTab("saved")}><Bookmark size={17}/> Saved roles <span className="nav-count">{savedCount}</span></button>
      <button className={`nav-item ${activeTab==="companies"?"active":""}`} onClick={()=>setActiveTab("companies")}><Building2 size={17}/> Company directory</button>
      <div className="sidebar-bottom">
        <div className="side-label">YOUR JOB SEARCH</div>
        <div className="side-tip"><Sparkles size={17}/><div><b>Make every application count</b><p>Add your resume to see a role-by-role keyword fit estimate.</p><button onClick={()=>setShowResume(true)}>Set up resume <span>↗</span></button></div></div>
        <div className="sidebar-foot"><span className="status-dot"/> Live public job feeds <span className="tiny">v1.0</span></div>
      </div>
    </aside>

    <section className="main">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>{activeTab==="roles"?"Product roles":activeTab==="saved"?"Saved roles":"Company directory"}</b></div><div className="top-actions"><span className="live-indicator"><i/> FEED STATUS</span><button className="icon-button" onClick={loadJobs} title="Refresh jobs"><RefreshCw size={16}/></button><button className="profile" onClick={()=>setShowResume(true)}>NK</button></div></header>
      <div className="content">
        <div className="hero-row"><div><div className="eyebrow"><span/> YOUR NEXT PRODUCT ROLE STARTS HERE</div><h1>Find your next <span>big move.</span></h1><p className="hero-copy">A focused command center for product management opportunities, resume fit, and your application pipeline.</p></div><div className="hero-graphic"><div className="orb orb-one"/><div className="orb orb-two"/><div className="graphic-card"><Activity size={18}/><span>CAREER MOMENTUM</span><b>{resume.trim()?"Resume match enabled":"Ready when you are"}</b><small>{resume.trim()?"Personalized role ranking is active":"Add your resume to personalize results"}</small></div></div></div>

        <div className="stats-grid">
          <div className="stat-card"><div className="stat-top"><span>Matching open roles</span><span className="stat-icon blue"><BriefcaseBusiness size={17}/></span></div><div className="stat-number">{loading?"—":ranked.length}</div><div className="stat-foot"><span className="green-dot"/> From public company ATS feeds</div></div>
          <div className="stat-card"><div className="stat-top"><span>High-fit opportunities</span><span className="stat-icon green"><Target size={17}/></span></div><div className="stat-number">{resume.trim()?highFit:"—"}</div><div className="stat-foot">{resume.trim()?"Estimated fit score of 70%+":"Add resume to calculate fit"}</div></div>
          <div className="stat-card"><div className="stat-top"><span>Saved for later</span><span className="stat-icon purple"><Bookmark size={17}/></span></div><div className="stat-number">{savedCount}</div><div className="stat-foot">Stored in this browser</div></div>
          <div className="stat-card"><div className="stat-top"><span>Career destinations</span><span className="stat-icon orange"><Globe2 size={17}/></span></div><div className="stat-number">{careerLinks.length}</div><div className="stat-foot">FAANG, AI, fintech & tech</div></div>
        </div>

        {activeTab==="companies" ? <section className="panel"><div className="panel-head"><div><h2>Company directory</h2><p>Jump directly to official career sites and search product management openings.</p></div></div><div className="company-grid">{careerLinks.map(c=><a key={c.name} className="company-tile" href={c.url} target="_blank" rel="noreferrer"><span className="company-logo">{companyInitials(c.name)}</span><span><b>{c.name}</b><small>{c.category}</small></span><ExternalLink size={15}/></a>)}</div></section> : <>
          <section className="panel jobs-panel">
            <div className="panel-head"><div><div className="section-kicker">OPPORTUNITY EXPLORER</div><h2>{activeTab==="saved"?"Your saved roles":"Open product roles"} <span className="count-pill">{ranked.length}</span></h2><p>Live listings from supported public ATS boards. Apply links go to the employer's site.</p></div><div className="panel-head-actions"><button className={`outline-btn ${showResume?"selected":""}`} onClick={()=>setShowResume(!showResume)}><FileText size={15}/>{resume.trim()?"Edit resume":"Add resume"}</button><button className="primary-btn" onClick={loadJobs}><RefreshCw size={15}/> Refresh feed</button></div></div>
            {showResume && <div className="resume-box"><div className="resume-heading"><div><b>Resume fit analyzer</b><p>Paste resume text below. It stays in your browser and is not sent to the job feed API.</p></div><button className="close-btn" onClick={()=>setShowResume(false)}><X size={17}/></button></div><textarea value={resume} onChange={e=>setResume(e.target.value)} placeholder="Paste your resume text here — experience, skills, impact metrics, education..." rows={6}/><div className="resume-controls"><button className="outline-btn" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Upload .txt</button><input ref={fileRef} type="file" accept=".txt,text/plain" hidden onChange={e=>readResume(e.target.files?.[0])}/><span>{resume.length.toLocaleString()} characters · local-only analysis</span><button className="text-btn" onClick={()=>setResume("")}>Clear resume</button></div></div>}
            <div className="filter-row"><div className="search-wrap"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title, company, keyword..."/>{query&&<button onClick={()=>setQuery("")}><X size={14}/></button>}</div><div className="select-wrap"><Filter size={15}/><select value={company} onChange={e=>setCompany(e.target.value)}>{companies.map(c=><option key={c}>{c}</option>)}</select><ChevronDown size={14}/></div><div className="select-wrap location-select"><Globe2 size={15}/><select value={location} onChange={e=>setLocation(e.target.value)}>{locations.map(l=><option key={l}>{l}</option>)}</select><ChevronDown size={14}/></div><div className="select-wrap sort-select"><ArrowDownUp size={15}/><select value={sort} onChange={e=>setSort(e.target.value)}><option value="match">Best resume fit</option><option value="recent">Recently updated</option><option value="company">Company A–Z</option><option value="title">Title A–Z</option></select><ChevronDown size={14}/></div></div>
            <div className="filter-foot"><span>{loading?<><span className="spinner"/> Fetching live roles…</>:<>Showing <b>{ranked.length}</b> opportunities</>} {lastUpdated&&<span className="updated">· Updated {lastUpdated}</span>}</span><label className="toggle-label"><input type="checkbox" checked={savedOnly} onChange={e=>setSavedOnly(e.target.checked)}/> Saved only</label></div>
            {error&&<div className="notice"><span>{error}</span><button onClick={()=>setError("")}><X size={14}/></button></div>}
            <div className="job-list">
              {!loading && ranked.length===0 && <div className="empty-state"><div className="empty-icon"><Search size={22}/></div><h3>{jobs.length===0?"No live feed results yet":"No roles match these filters"}</h3><p>{jobs.length===0?"The public feeds may be temporarily unavailable or board slugs may need configuration. Use the official career directory as a fallback.":"Try broadening your search, clearing filters, or refreshing the feed."}</p><button className="outline-btn" onClick={()=>{setQuery("");setCompany("All companies");setLocation("All locations");setSavedOnly(false);setActiveTab("roles");}}>Clear filters</button></div>}
              {ranked.map(job=><article className="job-card" key={job.id}><div className="company-logo job-logo">{companyInitials(job.company)}</div><div className="job-info"><div className="job-title-line"><h3>{job.title}</h3>{job.match&&<span className={`match-badge ${job.match.score>=70?"high":job.match.score>=45?"medium":"low"}`}><Target size={12}/>{job.match.score}% fit</span>}</div><div className="job-meta"><span><Building2 size={13}/>{job.company}</span><span><Globe2 size={13}/>{job.location||"Location not listed"}</span><span className="source-tag">{job.source}</span></div><p className="job-description">{cleanHtml(job.description).slice(0,245)}{job.description.length>245?"…":""}</p>{job.match&&<div className="match-details">{job.match.matched.length>0&&<span className="matched"><Check size={12}/> {job.match.matched.slice(0,3).join(" · ")}</span>}{job.match.missing.length>0&&<span className="missing">Improve: {job.match.missing.slice(0,2).join(", ")}</span>}</div>}</div><div className="job-actions"><button className={`save-btn ${saved.includes(job.id)?"saved":""}`} onClick={()=>toggleSaved(job.id)} title={saved.includes(job.id)?"Unsave role":"Save role"}><Bookmark size={17} fill={saved.includes(job.id)?"currentColor":"none"}/></button><a className="apply-btn" href={job.url} target="_blank" rel="noreferrer">Apply <ExternalLink size={13}/></a></div></article>)}
            </div>
            <div className="feed-note"><span className="green-dot"/> Live results are filtered to product-related titles. <span>Fit scores are heuristic estimates, not hiring predictions.</span></div>
          </section>
          <section className="panel directory-panel"><div className="panel-head"><div><div className="section-kicker">EXPAND YOUR SEARCH</div><h2>Explore top companies</h2><p>Official career portals are available even when a company doesn't expose a supported public feed.</p></div><button className="text-btn" onClick={()=>setActiveTab("companies")}>View all companies <span>→</span></button></div><div className="company-strip">{careerLinks.slice(0,8).map(c=><a key={c.name} href={c.url} target="_blank" rel="noreferrer" className="company-chip"><span className="mini-logo">{companyInitials(c.name)}</span>{c.name}<ExternalLink size={12}/></a>)}</div></section>
        </>}
        <footer><span>ROLE RADAR <span className="footer-sep">/</span> PERSONAL JOB SEARCH WORKSPACE</span><span>Built for a sharper job search · <a href="https://github.com" target="_blank" rel="noreferrer">Open source ready</a></span></footer>
      </div>
    </section>
  </main>;
}