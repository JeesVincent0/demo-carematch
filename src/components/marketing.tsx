import Link from 'next/link';
import {
  ArrowRight,
  Stethoscope,
  HeartHandshake,
  HandHeart,
  Coffee,
  Moon,
  House,
  Sprout,
  Activity,
  MapPin,
  Search,
} from 'lucide-react';
import { services, faqs } from '@/modules/content';
import { professions, careTypes } from '@/modules/domain';
import { Button } from './ui/button';
const icons = { Stethoscope, HeartHandshake, HandHeart, Coffee, Moon, House, Sprout, Activity };
export function ServiceCards({ all = false }: { all?: boolean }) {
  return (
    <div className="service-grid">
      {services.slice(0, all ? 8 : 4).map((s, i) => {
        const Icon = icons[s.icon as keyof typeof icons];
        return (
          <Link href={`/services/${s.slug}`} className={`service-card service-${i}`} key={s.slug}>
            <span className="service-icon">
              <Icon size={25} strokeWidth={1.5} />
            </span>
            <h3>{s.title}</h3>
            <p>{s.copy}</p>
            <span className="service-link">
              Explore care <ArrowRight size={16} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
export function SearchWidget() {
  return (
    <form className="search-widget" action="/find-care">
      <label>
        <span>
          <MapPin size={15} /> Where do you need care?
        </span>
        <input name="location" placeholder="Enter city or postcode" />
      </label>
      <label>
        <span>Professional type</span>
        <select name="profession" defaultValue="">
          <option value="">All professionals</option>
          {professions.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Type of care</span>
        <select name="care" defaultValue="">
          <option value="">All types of care</option>
          {careTypes.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <Button type="submit">
        <Search size={18} /> Find care
      </Button>
    </form>
  );
}
export function FAQ({ limit = 7 }: { limit?: number }) {
  return (
    <div className="faq-list">
      {faqs.slice(0, limit).map(([q, a]) => (
        <details key={q}>
          <summary>
            {q}
            <span>+</span>
          </summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
export function FinalCTA() {
  return (
    <section className="container">
      <div className="final-cta">
        <div>
          <p className="eyebrow">A little support. A big difference.</p>
          <h2>
            Find the right care
            <br />
            with confidence.
          </h2>
          <p>Start with a person. Find a connection. Feel at home.</p>
        </div>
        <div className="cta-buttons">
          <Button asChild>
            <Link href="/find-care">
              Find care <ArrowRight size={18} />
            </Link>
          </Button>
          <Link href="/become-a-professional">
            Become a care professional <ArrowRight size={16} />
          </Link>
        </div>
        <HeartHandshake className="cta-decoration" />
      </div>
    </section>
  );
}
