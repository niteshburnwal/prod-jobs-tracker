import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Job = { id:string; company:string; title:string; location:string; url:string; description:string; postedAt?:string; source:string; remote?:boolean };
const greenhouse = [
  ["Stripe","stripe"],["Coinbase","coinbase"],["DoorDash","doordash"],["Reddit","reddit"],
  ["Roblox","roblox"],["Datadog","datadog"],["Figma","figma"],["Cloudflare","cloudflare"],
  ["Duolingo","duolingo"],["Ramp","ramp"],["Plaid","plaid"],["Asana","asana"]
];
const lever = [["Uber","uber"],["Palantir","palantir"],["Lyft","lyft"],["Brex","brex"]];
const ashby = [["OpenAI","openai"],["Linear","linear"],["Notion","notion"],["Ramp","ramp"],["Perplexity","perplexity"],["Vercel","vercel"],["Rippling","rippling"]];
const isProductRole = (title:string) => /(product manager|product management|product lead|group product|principal product|director of product|product owner|product strategy|technical product|product operations|product growth)/i.test(title);

async function fetchJson(url:string) {
  const response = await fetch(url,{headers:{"User-Agent":"RoleRadar/1.0 (public job board reader)","Accept":"application/json"},signal:AbortSignal.timeout(7000),cache:"no-store"});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
async function getGreenhouse(company:string,slug:string):Promise<Job[]> {
  const data=await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`);
  return (data.jobs||[]).filter((j:any)=>isProductRole(j.title)).map((j:any)=>({
    id:`gh-${slug}-${j.id}`,company,title:j.title,location:j.location?.name||"Not specified",url:j.absolute_url,
    description:String(j.content||""),postedAt:j.updated_at||j.first_published,source:"Greenhouse"
  }));
}
async function getLever(company:string,slug:string):Promise<Job[]> {
  const data=await fetchJson(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`);
  return (Array.isArray(data)?data:[]).filter((j:any)=>isProductRole(j.text||"")).map((j:any)=>({
    id:`lever-${slug}-${j.id}`,company,title:j.text,location:j.categories?.location||j.categories?.allLocations?.join(", ")||"Not specified",
    url:j.hostedUrl||j.applyUrl,description:j.descriptionPlain||j.description||"",postedAt:j.createdAt?new Date(j.createdAt).toISOString():"",
    source:"Lever",remote:/remote/i.test(j.categories?.location||"")
  }));
}
async function getAshby(company:string,slug:string):Promise<Job[]> {
  const data=await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`);
  return (data.jobs||[]).filter((j:any)=>isProductRole(j.title||"")).map((j:any)=>({
    id:`ashby-${slug}-${j.id||j.jobUrl}`,company,title:j.title,location:j.location||j.locationName||"Not specified",
    url:j.jobUrl||j.applyUrl,description:j.descriptionPlain||j.descriptionHtml||"",postedAt:j.publishedAt||"",
    source:"Ashby",remote:/remote/i.test(j.location||"")
  }));
}
export async function GET() {
  const extraGh=(process.env.GREENHOUSE_BOARDS||"").split(",").map(s=>s.trim()).filter(Boolean).map(s=>[s,s] as [string,string]);
  const extraLever=(process.env.LEVER_BOARDS||"").split(",").map(s=>s.trim()).filter(Boolean).map(s=>[s,s] as [string,string]);
  const extraAshby=(process.env.ASHBY_BOARDS||"").split(",").map(s=>s.trim()).filter(Boolean).map(s=>[s,s] as [string,string]);
  const tasks=[
    ...[...greenhouse,...extraGh].map(([n,s])=>getGreenhouse(n,s)),
    ...[...lever,...extraLever].map(([n,s])=>getLever(n,s)),
    ...[...ashby,...extraAshby].map(([n,s])=>getAshby(n,s))
  ];
  const results=await Promise.allSettled(tasks);
  const jobs=results.flatMap(r=>r.status==="fulfilled"?r.value:[]);
  const failed=results.filter(r=>r.status==="rejected").length;
  const unique=[...new Map(jobs.filter(j=>j.url).map(j=>[j.url,j])).values()]
    .sort((a,b)=>(b.postedAt||"").localeCompare(a.postedAt||""));
  return NextResponse.json({
    jobs:unique,
    updatedAt:new Date().toISOString(),
    warning:failed===tasks.length?"Live feeds did not respond. Check board slugs or use the company directory.":failed>0?`${failed} of ${tasks.length} public feeds were unavailable; results include successful feeds only.`:undefined,
    sources:{greenhouse:greenhouse.length+extraGh.length,lever:lever.length+extraLever.length,ashby:ashby.length+extraAshby.length}
  },{headers:{"Cache-Control":"no-store, max-age=0"}});
}