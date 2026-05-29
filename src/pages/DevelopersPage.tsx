import { BadgeCheck, ExternalLink, Github, Instagram, Send, Sparkles } from 'lucide-react';

type PlatformLink = {
  href: string;
  icon: typeof Github;
  platform: string;
  hoverClass: string;
};

const developers = [
  {
    name: 'موسى العوض',
    role: 'Software Engineering Student & Full-Stack Developer',
    bio: 'Mousa Alawad is a software engineering student and full-stack developer building real applications while studying IT engineering. His work sits at the intersection of backend logic, front-end precision, and algorithmic thinking — grounded in actual projects, not theory alone.',
    portfolio: 'https://mousa-portfolio-lime.vercel.app/',
    accent: 'from-cyan-500/20 to-blue-500/20',
    ring: 'border-cyan-500/20',
    links: [
      {
        href: 'https://t.me/Mousa_Alawad',
        icon: Send,
        platform: 'Telegram',
        hoverClass: 'hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-300',
      },
      {
        href: 'https://instagram.com/1Mousa_Alawad',
        icon: Instagram,
        platform: 'Instagram',
        hoverClass: 'hover:border-pink-500/40 hover:bg-pink-500/10 hover:text-pink-300',
      },
      {
        href: 'https://github.com/MousaAlawad1',
        icon: Github,
        platform: 'GitHub',
        hoverClass: 'hover:border-slate-400/40 hover:bg-slate-400/10 hover:text-slate-100',
      },
    ] satisfies PlatformLink[],
  },
  {
    name: 'عبدالمعين حبلص',
    role: 'Versatile Technologist',
    bio: 'A versatile technologist with expertise spanning full-stack development, cybersecurity, and financial markets. I build robust systems, secure digital infrastructures, and intelligent trading tools — bridging the gap between code and capital.',
    portfolio: 'https://portfolio-monopoly63s-projects.vercel.app/',
    accent: 'from-purple-500/20 to-pink-500/20',
    ring: 'border-purple-500/20',
    links: [
      {
        href: 'https://t.me/mono_43',
        icon: Send,
        platform: 'Telegram',
        hoverClass: 'hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-300',
      },
      {
        href: 'https://www.instagram.com/li0vy_?igsh=MXZ2czd3ODA3ejJ6ZA==',
        icon: Instagram,
        platform: 'Instagram',
        hoverClass: 'hover:border-pink-500/40 hover:bg-pink-500/10 hover:text-pink-300',
      },
      {
        href: 'https://github.com/Monopoly63',
        icon: Github,
        platform: 'GitHub',
        hoverClass: 'hover:border-slate-400/40 hover:bg-slate-400/10 hover:text-slate-100',
      },
    ] satisfies PlatformLink[],
  },
] as const;

function ContactLink({ href, icon: Icon, platform, hoverClass }: PlatformLink) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-xl border border-line/70 bg-surface-2/70 px-3 py-2 text-sm text-fg-2 transition-colors ${hoverClass}`}
    >
      <Icon className="h-4 w-4" />
      <span>{platform}</span>
    </a>
  );
}

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-ink text-fg-1" dir="rtl">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-8rem] h-72 w-72 rounded-full bg-brass/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative container mx-auto max-w-6xl px-6 py-16 pt-28">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brass/20 bg-brass/10 px-4 py-2 text-xs font-medium text-brass-ring">
            <Sparkles className="h-3.5 w-3.5" />
            الفريق الذي يبني ويطوّر شيّرلي
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">المطورون</h1>
          <p className="mt-4 text-base leading-8 text-fg-3 sm:text-lg">
            صفحة أبسط، أوضح، وأخف بصريًا — تركز على الأشخاص وخبراتهم وروابطهم الأساسية بدون ازدحام أو مؤثرات مرهقة.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {developers.map((dev) => (
            <section key={dev.name} className="surface-floating accent-top p-7 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${dev.ring} bg-gradient-to-br ${dev.accent}`}>
                    <BadgeCheck className="h-7 w-7 text-brass-ring" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">{dev.name}</h2>
                    <p className="mt-1 text-sm font-medium text-brass-ring">{dev.role}</p>
                  </div>
                </div>

                <a
                  href={dev.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-line/70 bg-surface-2/70 px-4 py-2 text-sm text-fg-2 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Portfolio</span>
                </a>
              </div>

              <p className="mt-6 text-sm leading-8 text-fg-3 sm:text-[15px]">{dev.bio}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                {dev.links.map((link) => (
                  <ContactLink key={`${dev.name}-${link.platform}`} {...link} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
