import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { posts } from "@/lib/content";

export function JournalSection() {
  return (
    <section className="journal-section wrap">
      <div className="section-heading">
        <div>
          <p className="eyebrow">05 / FIELD NOTES</p>
          <h2>
            Thinking <span className="serif">out loud.</span>
          </h2>
        </div>
        <Link className="text-link" href="/blogs">
          Read the journal <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="journal-grid">
        {posts.slice(0, 2).map((post) => (
          <Link
            className="journal-card"
            key={post.slug}
            href={`/blogs/${post.slug}`}
          >
            <img
              src={post.image}
              width="800"
              height="450"
              loading="lazy"
              alt=""
            />
            <div>
              <p className="eyebrow">
                {post.category} · {post.read}
              </p>
              <h3>
                {post.title}
                <ArrowUpRight size={22} />
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
