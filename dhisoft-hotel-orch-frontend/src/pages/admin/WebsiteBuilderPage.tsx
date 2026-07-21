import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, Plus, Save, Send, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { Section, SitePage, Theme } from '../../types';

const templates: Record<string, Record<string, any>> = {
  hero: { eyebrow:'New collection', heading:'Your hotel story', description:'Describe the guest experience.', backgroundImage:'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1600&q=80', primaryCta:{label:'Book Now',href:'/booking'} },
  'booking-search': { title:'Search Stays', layout:'card', showPropertySelector:true, showPromoCode:true },
  'featured-properties': { heading:'Featured Hotels', propertyIds:[], showStartingPrice:true },
  rooms: { heading:'Featured Rooms', propertyId:'', roomTypeIds:[], showPrices:true },
  offers: { heading:'Special Offers', offerIds:[], showPromoCode:true },
  'feature-grid': { heading:'Why book direct', items:[{title:'Best Rate',text:'Direct booking benefits.'}] },
  gallery: { heading:'Gallery', images:[] },
  contact: { heading:'Contact us', email:'', phone:'' },
};

export default function WebsiteBuilderPage() {
  const [pages,setPages]=useState<SitePage[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [page,setPage]=useState<SitePage|null>(null);
  const [themes,setThemes]=useState<Theme[]>([]);
  const [themeText,setThemeText]=useState('{}');
  const [active,setActive]=useState(0);
  const [notice,setNotice]=useState('');
  const [newPageTitle,setNewPageTitle]=useState('');
  const [seoText,setSeoText]=useState('{}');
  const [navigationText,setNavigationText]=useState('[]');

  const sections=useMemo(()=>page?.draftContent?.sections??[],[page]);
  const current=sections[active];

  async function load(preferredId?:string){
    const [pageResponse,themeResponse]=await Promise.all([api.get('/website/pages'),api.get('/website/themes')]);
    setPages(pageResponse.data);
    setThemes(themeResponse.data);
    const activeTheme=themeResponse.data.find((t:Theme)=>t.config&&t)??themeResponse.data[0];
    if(activeTheme)setThemeText(JSON.stringify(activeTheme.config,null,2));
    const id=preferredId??selectedId??pageResponse.data[0]?.id;
    if(id)await select(id);
  }

  useEffect(()=>{load().catch(()=>setNotice('Could not load builder. Ensure backend is running.'));},[]);

  async function select(id:string){
    setSelectedId(id);
    const response=await api.get(`/website/pages/${id}`);
    const selected=response.data as SitePage;
    setPage(selected); setActive(0);
    setSeoText(JSON.stringify(selected.seo??{},null,2));
    setNavigationText(JSON.stringify(selected.navigation??[],null,2));
  }

  function updateSections(next:Section[]){if(page)setPage({...page,draftContent:{...page.draftContent,sections:next}})}
  function move(index:number,direction:number){const next=[...sections];const destination=index+direction;if(destination<0||destination>=next.length)return;[next[index],next[destination]]=[next[destination],next[index]];updateSections(next);setActive(destination)}
  function add(type:string){const next=[...sections,{id:`${type}-${crypto.randomUUID().slice(0,8)}`,type,settings:structuredClone(templates[type])}];updateSections(next);setActive(next.length-1)}
  function remove(index:number){updateSections(sections.filter((_,i)=>i!==index));setActive(Math.max(0,index-1))}

  async function createPage(){
    const title=newPageTitle.trim(); if(!title)return;
    const slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    const response=await api.post('/website/pages',{title,slug,draftContent:{sections:[]},seo:{title,description:''},navigation:[],themeId:(themes[0] as any)?.id});
    setNewPageTitle(''); await load(response.data.id); setNotice(`Page “${title}” created.`);
  }

  function parsePageMetadata(){
    try{return {seo:JSON.parse(seoText),navigation:JSON.parse(navigationText)}}catch{throw new Error('SEO and navigation must contain valid JSON.');}
  }

  async function save(){
    if(!page?.id)return;
    try{
      const metadata=parsePageMetadata();
      await api.patch(`/website/pages/${page.id}`,{title:page.title,draftContent:page.draftContent,...metadata});
      setNotice('Draft saved with a version snapshot.');
    }catch(error:any){setNotice(error.response?.data?.message??error.message??'Draft save failed.');}
  }

  async function publish(){await save();if(page?.id){await api.post(`/website/pages/${page.id}/publish`);setNotice('Published successfully.')}}

  async function saveTheme(){
    try{
      const config=JSON.parse(themeText); const currentTheme=themes.find((t:any)=>t.active)??themes[0];
      await api.post('/website/themes',{name:currentTheme?.name??'RainWood Heritage',key:currentTheme?.key??'rainwood-heritage',config,active:true});
      setNotice('Theme tokens saved and activated.');
    }catch(error:any){setNotice(error.response?.data?.message??'Theme configuration must be valid JSON.');}
  }

  function updateCurrentSettings(value:string){
    try{const settings=JSON.parse(value);const next=[...sections];next[active]={...current,settings};updateSections(next);setNotice('')}
    catch{setNotice('Section settings must remain valid JSON.');}
  }

  return <section>
    <div className="admin-heading"><div><div className="kicker">Section Builder</div><h2>Hotel Website Builder</h2></div><div className="builder-actions"><button className="btn secondary" onClick={()=>window.open('/','preview')}><Eye/>Preview</button><button className="btn secondary" onClick={save}><Save/>Save Draft</button><button className="btn gold" onClick={publish}><Send/>Publish</button></div></div>
    {notice&&<div className="notice">{notice}</div>}
    <div className="builder-shell">
      <aside className="builder-pages">
        <h3>Pages</h3>{pages.map(p=><button className={selectedId===p.id?'active':''} onClick={()=>select(p.id!)} key={p.id}>{p.title}<span>{p.status}</span></button>)}
        <label>New Page<input placeholder="e.g. Weddings" value={newPageTitle} onChange={e=>setNewPageTitle(e.target.value)}/></label><button className="btn secondary full" onClick={createPage}><Plus/>Create Page</button>
        <h3>Add Section</h3><div className="section-palette">{Object.keys(templates).map(type=><button key={type} onClick={()=>add(type)}><Plus size={15}/>{type}</button>)}</div>
      </aside>
      <div className="builder-canvas"><div className="canvas-top"><strong>{page?.title??'Page'}</strong><span>Section order</span></div>{sections.map((section,index)=><div key={section.id} className={`section-block ${active===index?'active':''}`} onClick={()=>setActive(index)}><div><strong>{section.type}</strong><span>{section.settings.heading??section.settings.title??section.settings.eyebrow??'Section'}</span></div><div className="block-actions"><button onClick={e=>{e.stopPropagation();move(index,-1)}}><ArrowUp/></button><button onClick={e=>{e.stopPropagation();move(index,1)}}><ArrowDown/></button><button onClick={e=>{e.stopPropagation();remove(index)}}><Trash2/></button></div></div>)}</div>
      <aside className="builder-inspector">
        <h3>Section Settings</h3>{current?<><label>Section Type<input value={current.type} disabled/></label><label>Validated Settings JSON<textarea rows={16} value={JSON.stringify(current.settings,null,2)} onChange={e=>updateCurrentSettings(e.target.value)}/></label><p className="small">Only approved structured sections are accepted. Raw HTML and scripts are rejected by the backend.</p></>:<p>Select or add a section.</p>}
        <h3>SEO</h3><label>SEO JSON<textarea rows={7} value={seoText} onChange={e=>setSeoText(e.target.value)}/></label>
        <h3>Navigation</h3><label>Navigation JSON<textarea rows={7} value={navigationText} onChange={e=>setNavigationText(e.target.value)}/></label>
      </aside>
    </div>
    <div className="panel spaced"><div className="admin-heading compact"><div><div className="kicker">Branding</div><h3>Theme Tokens</h3></div><button className="btn secondary" onClick={saveTheme}><Save/>Save Theme</button></div><label>Theme Configuration JSON<textarea rows={12} value={themeText} onChange={e=>setThemeText(e.target.value)}/></label><p className="small">Controls logo, fonts, navy/gold palette, radii and button style for RainWood and future hotel tenants.</p></div>
  </section>
}
