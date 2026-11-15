'use client';
import { useCallback } from 'react';
import { DemoView } from '@/components/demo-view';
import Link from 'next/link';
import { SlidersHorizontal } from 'lucide-react';
import { searchWorkers, value, type SearchParams } from '@/modules/queries';
import { professions, careTypes, days } from '@/modules/domain';
import { PageIntro, ProfessionalCard, Empty } from '@/components/shared';
import { Button } from '@/components/ui/button';
async function renderFindCare({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const p = await searchParams;
  const { workers, total, page, pages } = await searchWorkers(p);
  const pageLink = (n: number) => {
    const q = new URLSearchParams();
    Object.entries(p).forEach(([k, v]) => {
      if (typeof v === 'string') q.set(k, v);
    });
    q.set('page', String(n));
    return `/find-care?${q}`;
  };
  return (
    <div className="container">
      <PageIntro
        eyebrow="The right people. The right support."
        title="Find a connection that feels right."
        description="Explore care professionals, learn their stories and find the support that fits your life."
      />
      <form id="filters" action="/find-care" className="search-layout">
        <details className="filter-details" open>
          <summary className="filter-toggle">
            <SlidersHorizontal size={17} /> Filter your search
          </summary>
          <aside className="filter-panel">
            <div className="row between">
              <h3>Find your care</h3>
              <Link href="/find-care" className="text-link small">
                Reset
              </Link>
            </div>
            <label>
              City or postcode
              <input
                name="location"
                defaultValue={value(p, 'location')}
                placeholder="e.g. London or SW1"
              />
            </label>
            <label>
              Professional category
              <select name="profession" defaultValue={value(p, 'profession')}>
                <option value="">All professionals</option>
                {professions.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Type of care
              <select name="care" defaultValue={value(p, 'care')}>
                <option value="">All types of care</option>
                {careTypes.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Minimum rate (£/hr)
              <input
                name="min"
                type="number"
                min="0"
                max="500"
                defaultValue={value(p, 'min')}
                placeholder="Any"
              />
            </label>
            <label>
              Maximum rate (£/hr)
              <input
                name="max"
                type="number"
                min="0"
                max="500"
                defaultValue={value(p, 'max')}
                placeholder="Any"
              />
            </label>
            <label>
              Experience
              <select name="experience" defaultValue={value(p, 'experience')}>
                <option value="">Any experience</option>
                {[2, 5, 10, 15].map((v) => (
                  <option key={v} value={v}>
                    {v}+ years
                  </option>
                ))}
              </select>
            </label>
            <label>
              Language
              <select name="language" defaultValue={value(p, 'language')}>
                <option value="">Any language</option>
                {['English', 'Welsh', 'Hindi', 'Urdu', 'French', 'Spanish', 'Polish'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Available on
              <select name="day" defaultValue={value(p, 'day')}>
                <option value="">Any day</option>
                {days.map((d, i) => (
                  <option value={i} key={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Specialisation
              <select name="specialisation" defaultValue={value(p, 'specialisation')}>
                <option value="">Any specialisation</option>
                {[
                  'Dementia support',
                  'Mobility support',
                  'Recovery support',
                  'Older adult care',
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <Button type="submit">Apply filters</Button>
          </aside>
        </details>
        <div>
          <div className="results-top">
            <strong>
              {total} professional{total !== 1 ? 's' : ''} to discover
            </strong>
            <label className="row">
              <span className="small muted">Sort</span>
              <select name="sort" aria-label="Sort professionals" defaultValue={value(p, 'sort')}>
                <option value="relevant">Most relevant</option>
                <option value="price-low">Lowest price</option>
                <option value="price-high">Highest price</option>
                <option value="experience">Most experienced</option>
              </select>
              <Button type="submit" size="sm" variant="outline">
                Go
              </Button>
            </label>
          </div>
          <p className="small muted" style={{ marginBottom: 18 }}>
            Fictional demo profiles. “Demo reviewed” refers to internal approval only.
          </p>
          {workers.length ? (
            <>
              <div className="results-grid">
                {workers.map((w) => (
                  <ProfessionalCard worker={w} key={w.id} />
                ))}
              </div>
              <div className="pagination">
                {page > 1 && (
                  <Button asChild variant="outline">
                    <Link href={pageLink(page - 1)}>Previous</Link>
                  </Button>
                )}
                <small>
                  Page {page} of {pages}
                </small>
                {page < pages && (
                  <Button asChild variant="outline">
                    <Link href={pageLink(page + 1)}>Next</Link>
                  </Button>
                )}
              </div>
            </>
          ) : (
            <Empty
              title="Let’s try a wider search."
              description="No professionals match these filters. Try a nearby city or adjust your care preferences."
              href="/find-care"
              cta="Clear filters"
            />
          )}
        </div>
      </form>
    </div>
  );
}

export default function FindCare({ query }: { query: SearchParams }) {
  const load = useCallback(() => renderFindCare({ searchParams: Promise.resolve(query) }), [query]);
  return <DemoView load={load} />;
}
