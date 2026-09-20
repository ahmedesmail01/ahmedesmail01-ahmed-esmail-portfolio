import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {posts} from '@/lib/content';
import {Header,Footer} from '@/components/site-shell';
export const metadata={title:'Journal',description:'Notes on frontend architecture, product engineering and dependable delivery.'};
export default function Blogs(){return <><Header/><main className="wrap"><section className="page-hero"><p className="eyebrow">THE JOURNAL / ENGINEERING NOTES</p><h1>Ideas worth<br/><span className="serif">thinking through.</span></h1><p>Practical notes on building better interfaces, connecting systems, and getting good work into production.</p></section><div className="blog-grid">{posts.map(p=><Link key={p.slug} href={`/blogs/${p.slug}`} className="journal-card"><img src={p.image} alt="" width="900" height="600" loading="lazy"/><div><p className="eyebrow">{p.category} · {p.read}</p><h3>{p.title}<ArrowUpRight size={22}/></h3><p>{p.intro}</p></div></Link>)}</div></main><Footer/></>}
