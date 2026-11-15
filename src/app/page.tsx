import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  ClipboardCheck,
  HeartHandshake,
  Check,
  Search,
  UserRoundSearch,
  Send,
  House,
  Sparkles,
  Headphones,
} from 'lucide-react';
import { MarketingLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { SectionHead, ProfessionalCard } from '@/components/shared';
import { SearchWidget, ServiceCards, FAQ, FinalCTA } from '@/components/marketing';
import { db } from '@/lib/prisma';
import { publicSelect, publicWhere } from '@/modules/queries';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const workers = await db.workerProfile.findMany({
    where: publicWhere,
    select: publicSelect,
    take: 4,
    orderBy: { createdAt: 'asc' },
  });
  return (
    <MarketingLayout>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="hero-kicker">
              <span /> PERSONAL CARE. MEANINGFUL CONNECTIONS.
            </p>
            <h1>
              <span className="hero-heading-intro">Find trusted care professionals</span>for the
              people
              <br />
              who <span>matter most.</span>
            </h1>
            <p className="hero-description">
              Discover compassionate nurses, carers and healthcare professionals across the UK. Find
              the right support for your loved ones with CareMatch.
            </p>
            <div className="hero-actions">
              <Button asChild size="lg">
                <Link href="/find-care">
                  Find care <ArrowRight size={19} />
                </Link>
              </Button>
              <Link className="hero-secondary" href="/become-a-professional">
                I&apos;m a care professional <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="hero-assurance">
              <span>
                <ShieldCheck size={18} /> Manually reviewed profiles
              </span>
              <span>
                <Check size={17} /> Your care, your choice
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-wrap">
              <Image
                src="/images/care-hero.jpg"
                alt="An older woman sharing a warm moment with a companion at home"
                fill
                priority
                sizes="(max-width: 800px) 100vw, 50vw"
              />
              <div className="hero-image-caption">
                A familiar face.
                <br />A little more peace of mind.
              </div>
            </div>
            <div className="hero-note">
              <span>
                <HeartHandshake size={26} />
              </span>
              <div>
                <strong>Care with a human touch</strong>
                <p>Because the right connection matters.</p>
              </div>
            </div>
            <div className="hero-spark">
              <Sparkles size={29} />
            </div>
          </div>
        </div>
        <div className="container hero-search">
          <SearchWidget />
          <div className="search-under">
            <span>Thoughtful support, close to home.</span>
            <span>
              Explore care across the United Kingdom <ArrowRight size={13} />
            </span>
          </div>
        </div>
      </section>
      <div className="trust-strip">
        <div className="container">
          {[
            [ShieldCheck, 'Manually reviewed profiles', 'People behind every profile'],
            [ClipboardCheck, 'Clear credential information', 'Understand their experience'],
            [HeartHandshake, 'Transparent care requests', 'Stay in control at every step'],
            [Headphones, 'Support, made simple', 'Guidance when you need it'],
          ].map(([I, title, copy]) => {
            const Icon = I as typeof ShieldCheck;
            return (
              <div className="trust-item" key={String(title)}>
                <Icon size={27} strokeWidth={1.5} />
                <div>
                  <strong>{String(title)}</strong>
                  <small>{String(copy)}</small>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <section className="section container">
        <SectionHead
          eyebrow="Care for every chapter"
          title="A little help, in all the right ways."
          copy="From everyday company to more dedicated support, find care that fits your life."
          href="/services"
          cta="Explore all services"
        />
        <ServiceCards />
      </section>
      <section className="how-section">
        <div className="container">
          <SectionHead
            eyebrow="A simpler way to find care"
            title="Your next chapter starts with a connection."
            copy="Finding the right support shouldn’t feel overwhelming. We make it personal."
          />
          <div className="steps-grid">
            {[
              [
                Search,
                '01',
                'Tell us what you need',
                'Start with your location and the type of support you’re looking for.',
              ],
              [
                UserRoundSearch,
                '02',
                'Meet your professionals',
                'Explore experience, skills and the person behind each profile.',
              ],
              [
                Send,
                '03',
                'Make a connection',
                'Send a care request and share what matters to you.',
              ],
              [
                House,
                '04',
                'Find your everyday support',
                'Track your request and agree the next steps together.',
              ],
            ].map(([I, n, t, c]) => {
              const Icon = I as typeof Search;
              return (
                <div className="step" key={String(n)}>
                  <div className="step-top">
                    <span>
                      <Icon size={25} />
                    </span>
                    <b>{String(n)}</b>
                  </div>
                  <h3>{String(t)}</h3>
                  <p>{String(c)}</p>
                </div>
              );
            })}
          </div>
          <p className="centred-note">
            A demonstration of the care journey. No real care is arranged on this platform.
          </p>
        </div>
      </section>
      <section className="section container">
        <SectionHead
          eyebrow="Good people. Meaningful care."
          title="Meet a few of our care professionals."
          copy="Explore fictional demo profiles, each reviewed through our internal workflow."
          href="/find-care"
          cta="Meet all professionals"
        />
        <div className="professional-grid">
          {workers.map((w) => (
            <ProfessionalCard worker={w} key={w.id} />
          ))}
        </div>
      </section>
      <section className="container values-section">
        <div className="values-image">
          <Image
            src="/images/care-hero.jpg"
            alt="Two women enjoying a quiet moment of companionship"
            fill
            sizes="50vw"
          />
          <span>
            It&apos;s the little things
            <br />
            that mean everything.
          </span>
        </div>
        <div className="values-copy">
          <p className="eyebrow">People first. Always.</p>
          <h2>
            More than finding care.
            <br />
            Finding peace of mind.
          </h2>
          <p>
            Choosing support for someone you love is personal. We give you the space, information
            and choice to find a connection that feels right.
          </p>
          {[
            [
              'The person behind the profile',
              'Get to know their experience, approach and the things they care about.',
            ],
            [
              'Your choice, your pace',
              'Compare clear profiles and indicative rates without pressure.',
            ],
            [
              'Clarity at every step',
              'Know where your request stands, from the first hello onwards.',
            ],
          ].map(([t, c]) => (
            <div className="value" key={t}>
              <span>
                <Check size={17} />
              </span>
              <div>
                <h3>{t}</h3>
                <p>{c}</p>
              </div>
            </div>
          ))}
          <Link className="text-link" href="/about">
            Get to know CareMatch <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <section className="section container faq-section">
        <div>
          <p className="eyebrow">Here to help</p>
          <h2>
            A few things you
            <br />
            might be wondering.
          </h2>
          <p className="muted">
            Finding care comes with questions.
            <br />
            Let&apos;s make things a little clearer.
          </p>
          <Link href="/faq" className="text-link">
            All your questions, answered <ArrowRight size={16} />
          </Link>
        </div>
        <FAQ limit={5} />
      </section>
      <FinalCTA />
    </MarketingLayout>
  );
}
