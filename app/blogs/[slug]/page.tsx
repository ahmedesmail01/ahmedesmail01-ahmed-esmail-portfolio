import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft,ArrowUpRight} from 'lucide-react';
import {posts} from '@/lib/content';
import {Header,Footer} from '@/components/site-shell';
export function generateStaticParams(){return posts.map(p=>({slug:p.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const p=posts.find(p=>p.slug===slug);return {title:p?.title??'Article not found',description:p?.intro};}
export default async function Blog({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const p=posts.find(p=>p.slug===slug);if(!p)notFound();return <><Header/><main className="wrap article-page"><Link className="back-link" href="/blogs"><ArrowLeft size={16}/> All field notes</Link><article><header><p className="eyebrow">{p.category} / {p.read}</p><h1>{p.title}</h1><p className="article-lead">{p.intro}</p><p className="eyebrow">AHMED ESMAIL · ENGINEERING JOURNAL</p></header><img className="article-image" src={p.image} width="1200" height="650" alt="Illustrative editorial photograph"/><div className="prose-content">{p.sections.map(([heading,text])=><section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}<div className="article-cta"><h3>Working through a similar challenge?</h3><Link className="text-link" href="/#contact">Let's talk about your product <ArrowUpRight size={18}/></Link></div></div></article></main><Footer/></>}
