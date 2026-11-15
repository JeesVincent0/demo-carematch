import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  HeartHandshake,
  ClipboardCheck,
  UserRound,
  Search,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { PageIntro } from '@/components/shared';
import { FAQ, ServiceCards, FinalCTA } from '@/components/marketing';
import { Button } from '@/components/ui/button';
const pages: Record<string, [string, string, string]> = {
  about: [
    'Our story',
    'Care begins with connection.',
    'We believe finding support should feel human. CareMatch brings people, clear information and thoughtful choices together.',
  ],
  'how-it-works': [
    'One step at a time',
    'A simpler journey to the right support.',
    'Whether you’re looking for care or offering it, here’s how to get started.',
  ],
  services: [
    'Care for every chapter',
    'Support that fits your life.',
    'Explore everyday help, companionship and professional care in familiar surroundings.',
  ],
  'become-a-professional': [
    'Do work that matters',
    'Your compassion. Someone’s everyday difference.',
    'Create your professional profile and connect with families looking for thoughtful, personal support.',
  ],
  contact: [
    'Let’s talk',
    'A friendly place to start.',
    'Need help finding your way around CareMatch? Explore the guides below or contact the demo team.',
  ],
  faq: [
    'Here to help',
    'Your questions, answered.',
    'A little clarity can make finding the right support feel easier.',
  ],
  privacy: [
    'Demo policy · Draft',
    'Your privacy matters.',
    'This policy is a demonstration draft, not legal advice or a production privacy notice.',
  ],
  terms: [
    'Demo terms · Draft',
    'Clear expectations, from the start.',
    'These terms are a demonstration draft, not legal advice or a contract for real care services.',
  ],
};
export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  return { title: pages[page]?.[1] || 'Page not found', description: pages[page]?.[2] };
}
export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const info = pages[page];
  if (!info) notFound();
  return (
    <>
      <div className="container page-section">
        <PageIntro eyebrow={info[0]} title={info[1]} description={info[2]} />
        {page === 'services' ? (
          <ServiceCards all />
        ) : page === 'faq' ? (
          <div className="prose">
            <FAQ />
          </div>
        ) : page === 'about' ? (
          <div className="content-grid">
            <div className="content-card">
              <HeartHandshake size={32} color="var(--primary)" />
              <h2 style={{ marginTop: 20 }}>People first, always.</h2>
              <p>
                Finding care for a loved one is a personal decision. CareMatch is designed to make
                professional discovery clear, considered and approachable — with space to learn
                about the person behind a profile.
              </p>
              <p>
                Search by the support you need, compare experience and indicative rates, and keep
                track of your requests in one place.
              </p>
              <Link className="text-link" href="/find-care">
                Meet the demo professionals <ArrowRight size={16} />
              </Link>
            </div>
            <div className="content-card">
              <ShieldCheck size={32} color="var(--primary)" />
              <h2 style={{ marginTop: 20 }}>Built on clarity.</h2>
              <p>
                CareMatch is a fictional marketplace demonstration. Every professional profile is
                fictional, and all approval badges refer to our internal manual demo workflow.
              </p>
              <p>
                We do not claim NHS affiliation, CQC registration or external identity, DBS, GMC,
                NMC or right-to-work checks. No real services, medical consultations or payments are
                provided.
              </p>
              <Link className="text-link" href="/how-it-works">
                Understand the process <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ) : page === 'how-it-works' || page === 'become-a-professional' ? (
          <>
            <div className="content-grid">
              {(page === 'become-a-professional'
                ? ['professionals']
                : ['families', 'professionals']
              ).map((kind) => (
                <div className="content-card" key={kind}>
                  <h2>
                    {kind === 'families' ? 'For clients and families' : 'For care professionals'}
                  </h2>
                  <div className="timeline">
                    {(kind === 'families'
                      ? [
                          [
                            'Search for care',
                            'Tell us your city or postcode and the support you’re looking for.',
                          ],
                          [
                            'Explore profiles',
                            'Read about skills, experience, availability and indicative hourly rates.',
                          ],
                          [
                            'Send a request',
                            'Choose a date, service and general location. Keep medical details out of this demo.',
                          ],
                          [
                            'Follow the next steps',
                            'Track acceptance, cancellation or demo completion in your dashboard.',
                          ],
                        ]
                      : [
                          [
                            'Create your account',
                            'Register as a care professional with your contact details and category.',
                          ],
                          [
                            'Tell your story',
                            'Complete your professional profile, skills, experience and work preferences.',
                          ],
                          [
                            'Submit your evidence',
                            'Add sample documents to this browser for a manual demo review.',
                          ],
                          [
                            'Connect with clients',
                            'Once approved, enable your listing and respond to care requests.',
                          ],
                        ]
                    ).map(([t, c], i) => (
                      <div className="timeline-item done" key={t}>
                        <strong>
                          {i + 1}. {t}
                        </strong>
                        <p>{c}</p>
                      </div>
                    ))}
                  </div>
                  <Button asChild>
                    <Link href={kind === 'families' ? '/register/client' : '/register/worker'}>
                      Get started <ArrowRight size={17} />
                    </Link>
                  </Button>
                </div>
              ))}
              {page === 'become-a-professional' && (
                <div className="content-card">
                  <UserRound size={34} color="var(--primary)" />
                  <h2 style={{ marginTop: 20 }}>Make room for your kind of care.</h2>
                  <p>
                    Show what makes your approach personal. Share your experience, set your
                    indicative rate and choose when you’re available.
                  </p>
                  <div className="timeline">
                    {[
                      [
                        'A profile that feels like you',
                        'Tell families about your skills, languages and experience.',
                      ],
                      [
                        'Your availability, clearly shared',
                        'Choose your days, times, travel radius and preferred care types.',
                      ],
                      [
                        'Requests in one place',
                        'Accept or decline requests and keep a record of every update.',
                      ],
                    ].map(([t, c]) => (
                      <div className="timeline-item done" key={t}>
                        <strong>{t}</strong>
                        <p>{c}</p>
                      </div>
                    ))}
                  </div>
                  <p className="small">
                    Only use sample documents. Internal approval does not establish permission to
                    provide regulated care.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : page === 'contact' ? (
          <div className="content-grid">
            <div className="content-card">
              <Mail size={30} color="var(--primary)" />
              <h2 style={{ marginTop: 18 }}>Demo support</h2>
              <p>hello@carematch.example</p>
              <p>
                This is a labelled demo contact address and does not receive messages. For this
                local demonstration, ask the person presenting the application for assistance.
              </p>
              <Link href="/faq" className="text-link">
                Browse common questions <ArrowRight size={16} />
              </Link>
            </div>
            <div className="content-card">
              <Search size={30} color="var(--primary)" />
              <h2 style={{ marginTop: 18 }}>Find your next step</h2>
              <p>
                Looking for support? Start with our search. Offering care? Follow the professional
                registration journey.
              </p>
              <div className="stack">
                <Link href="/find-care" className="text-link">
                  Find care <ArrowRight size={16} />
                </Link>
                <Link href="/register/worker" className="text-link">
                  Register as a professional <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="prose">
            {(page === 'privacy'
              ? [
                  [
                    'What this demo stores',
                    'The application starts from a bundled JSON file of fictional accounts and profiles. Your demo changes, hashed demo passwords, requests and sample uploads stay in browser local storage. No database or upload server is used.',
                  ],
                  [
                    'Use sample information only',
                    'Do not upload real identity documents or enter sensitive medical information. Use fictional details and sample evidence for every demonstration.',
                  ],
                  [
                    'Who can see information',
                    'The interface simulates role-based screens and shows approved, active listings. All data is accessible to anyone who can inspect this browser’s storage. This is not a secure system for real accounts or identity evidence.',
                  ],
                  [
                    'Simulated sign-in',
                    'Sign-in is simulated with a per-tab browser session. No authentication cookies or secure server sessions are used. Demo password-reset links are displayed locally rather than emailed. Never use a real password or personal data.',
                  ],
                  [
                    'Retention and requests',
                    'Use Reset this browser’s demo in Settings, or clear this site’s browser storage, to discard your changes. Other browsers have independent copies of the JSON demo. Clearing browser storage permanently removes your local changes.',
                  ],
                ]
              : [
                  [
                    'Demonstration only',
                    'CareMatch is a fictional demonstration of a care marketplace. No real care is booked, no payments are collected and no live medical consultations are provided.',
                  ],
                  [
                    'Accounts and appropriate use',
                    'Use fictional information and sample documents. You are responsible for keeping your demo credentials private. Do not upload real identity information, confidential records or harmful content.',
                  ],
                  [
                    'Internal review',
                    'Approval means an administrator reviewed an application in this demo. It is not evidence of real DBS, GMC, NMC, identity or right-to-work verification. The platform makes no regulatory or affiliation claims.',
                  ],
                  [
                    'Requests and cancellation',
                    'Requests may be pending, accepted, declined, cancelled or completed. Clients may cancel pending or accepted requests. An accepted request does not form a real care agreement.',
                  ],
                  [
                    'No medical or emergency service',
                    'This application does not provide medical advice or emergency support. Do not rely on it for care decisions or urgent assistance.',
                  ],
                ]
            ).map(([t, c]) => (
              <section key={t}>
                <h2>{t}</h2>
                <p>{c}</p>
              </section>
            ))}
            <Link href="/contact" className="text-link">
              Contact and support <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
      {!['privacy', 'terms', 'faq'].includes(page) && <FinalCTA />}
    </>
  );
}
