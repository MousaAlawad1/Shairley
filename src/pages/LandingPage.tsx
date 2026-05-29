// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/pages/LandingPage.tsx
// PURPOSE: Landing page — improved v2.1
//          ✅ FAQ section (أسئلة شائعة)
//          ✅ Clearer CTA: "ابدأ مجاناً"
//          ✅ Social proof counter
//          ✅ Better hero section
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  GraduationCap,
  Heart,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  Lock,
  Palette,
  Share2,
  Shield,
  Sparkles,
  UploadCloud,
  Users,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const features = [
  {
    icon: UploadCloud,
    title: 'رفع ومشاركة بلا تعقيد',
    desc: 'ارفع الملفات بسرعة، نظّمها داخل مساحات عمل واضحة، وشاركها مع الفريق من مكان واحد.',
  },
  {
    icon: Users,
    title: 'تعاون منظم',
    desc: 'أعضاء، أدوار، إشعارات، وسجل نشاط يساعد الفريق على المتابعة بدون فوضى.',
  },
  {
    icon: Lock,
    title: 'أمان عملي',
    desc: 'تسجيل دخول آمن، صلاحيات وأدوار واضحة لكل عضو، ومساحات خاصة لا يصلها إلا من تسمح له.',
  },
  {
    icon: Zap,
    title: 'واجهة سريعة وخفيفة',
    desc: 'تحسينات محسوبة على الواجهة بدون مؤثرات ثقيلة، حتى يبقى الاستخدام سلسًا أثناء العمل.',
  },
] as const;

const useCases = [
  {
    icon: GraduationCap,
    title: 'للطلاب والمواد الدراسية',
    desc: 'اجمع ملخصات المحاضرات، الواجبات، والامتحانات السابقة في مكان واحد منظم.',
  },
  {
    icon: Briefcase,
    title: 'لفرق العمل',
    desc: 'شارك المستندات والملفات مع زملائك، تابع التعديلات، ونظّم المشاريع بسهولة.',
  },
  {
    icon: Palette,
    title: 'للمشاريع الإبداعية',
    desc: 'ارفع التصاميم، الصور، والمسودات وشاركها مع العملاء أو الفريق لإبداء الملاحظات.',
  },
  {
    icon: Heart,
    title: 'للمشاريع الشخصية',
    desc: 'نظّم وثائقك، صور العائلة، أو أي ملفات تحتاج للوصول إليها من أي مكان.',
  },
] as const;

const workflow = [
  {
    icon: FolderKanban,
    title: 'أنشئ مساحة العمل',
    desc: 'ابدأ بمساحة لكل فريق أو مادة أو مشروع حتى تبقى الملفات مرتبة وواضحة.',
  },
  {
    icon: UploadCloud,
    title: 'ارفع ونظّم الملفات',
    desc: 'أضف اسمًا واضحًا ووصفًا لكل ملف لتسهيل الوصول والمراجعة على الجميع.',
  },
  {
    icon: Shield,
    title: 'شارك بثقة',
    desc: 'دعوات، أدوار، وسجل نشاط يمنحك تحكمًا أفضل في الوصول والمتابعة.',
  },
] as const;

const faqs = [
  {
    q: 'هل المنصة مجانية؟',
    a: 'نعم، شيّرلي مجانية بالكامل. يمكنك إنشاء مساحات عمل غير محدودة ورفع الملفات ودعوة الأعضاء بدون أي رسوم.',
  },
  {
    q: 'ما هو حجم التخزين المتاح؟',
    a: 'كل مساحة عمل تأتي بحد تخزين افتراضي 500 ميغابايت، ويمكن للمالك تعديل هذا الحد من إعدادات المساحة.',
  },
  {
    q: 'هل ملفاتي آمنة؟',
    a: 'نعم، الملفات محمية بصلاحيات الوصول. لا يمكن لأحد رؤية ملفات مساحتك إلا من قبلت دعوتهم أو أضفتهم.',
  },
  {
    q: 'ما أنواع الملفات المدعومة؟',
    a: 'تدعم المنصة جميع أنواع الملفات: صور، PDF، فيديو، صوت، مستندات Word وExcel، وأي نوع آخر.',
  },
  {
    q: 'كيف أدعو أعضاء جدد؟',
    a: 'من داخل مساحة العمل، انقر على زر "دعوة" في الأعلى، ثم انسخ رابط الدعوة وشاركه مع من تريد. سينضم مباشرةً عند فتح الرابط.',
  },
  {
    q: 'هل يمكنني استخدام المنصة على الموبايل؟',
    a: 'نعم، الواجهة متجاوبة بالكامل مع الهواتف والأجهزة اللوحية، ويمكنك استخدامها من أي متصفح.',
  },
] as const;

// ─── FAQ Item Component ───────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`rounded-2xl border transition-all cursor-pointer ${
        open ? 'border-brand-accent/30 bg-brand-accent/5' : 'border-line/60 bg-surface-2/60 hover:border-brand-accent/20'
      }`}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between p-5 gap-4">
        <p className="text-sm font-semibold text-fg-1">{q}</p>
        {open
          ? <ChevronUp className="h-4 w-4 text-brand-accent shrink-0" />
          : <ChevronDown className="h-4 w-4 text-fg-4 shrink-0" />
        }
      </div>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-sm leading-7 text-fg-3">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-ink text-fg-1" dir="rtl">

      {/* ── Hero Section ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line/60">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[-8rem] top-[-8rem] h-64 w-64 rounded-full bg-brass/10 blur-3xl" />
          <div className="absolute bottom-[-8rem] right-[-8rem] h-72 w-72 rounded-full bg-sage/10 blur-3xl" />
          <div className="grid-pattern absolute inset-0 opacity-30" />
        </div>

        <div className="container relative mx-auto px-6 py-20 sm:py-24 lg:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brass/20 bg-brass/10 px-4 py-2 text-xs font-medium text-brass-ring">
                <Sparkles className="h-3.5 w-3.5" />
                منصة ملفات وتعاون مطورة بعقلية إنتاجية
              </div>

              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                شيّرلي
                <span className="mt-2 block text-fg-3">مساحة عمل سحابية واضحة، سريعة، وقابلة للتوسّع</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-fg-3 sm:text-lg">
                نظّم ملفاتك، أنشئ مساحات عمل، شارك المواد والمستندات، وتابع نشاط الفريق من واجهة واحدة نظيفة.
                مصمَّمة لتكون أداة عملية يومية للأفراد والفرق والطلاب.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={() => navigate(user ? '/dashboard' : '/login')}
                  className="btn-primary px-6 py-3 text-base"
                >
                  {user ? 'افتح لوحة التحكم' : 'ابدأ مجاناً'}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a href="#features" className="btn-secondary px-6 py-3 text-base">
                  شاهد المزايا
                </a>
              </div>

              {/* Social proof */}
              <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-fg-3">
                <span className="inline-flex items-center gap-2 rounded-xl border border-sage/20 bg-sage/8 px-3 py-1.5 text-sage text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  مجاني بالكامل
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-brass/20 bg-brass/8 px-3 py-1.5 text-brass-ring text-xs font-medium">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  500+ مساحة عمل نشطة
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-brand-accent/20 bg-brand-accent/8 px-3 py-1.5 text-brand-accent text-xs font-medium">
                  <Shield className="h-3.5 w-3.5" />
                  ملفاتك آمنة
                </span>
              </div>
            </div>

            <div className="surface-floating accent-top p-6 sm:p-7">
              <div className="mb-5 flex items-center justify-between border-b border-line/70 pb-4">
                <div>
                  <p className="text-sm font-medium text-fg-2">أفكار للاستخدام</p>
                  <p className="mt-1 text-xs text-fg-4">مساحات تناسب كل احتياج — من الدراسة إلى العمل</p>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl border border-brass/20 bg-brass/10 px-3 py-1 text-xs text-brass-ring">
                  <Lightbulb className="h-3.5 w-3.5" />
                  أمثلة
                </div>
              </div>

              <div className="grid gap-3">
                {useCases.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-2xl border border-line/70 bg-surface-2/70 p-4 transition-colors hover:border-brass/30"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brass/20 bg-brass/10 text-brass-ring">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-fg-1">{item.title}</p>
                      <p className="mt-1 text-xs leading-6 text-fg-3">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ──────────────────────────────────────────────────── */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-sm font-medium text-brass-ring">المزايا الأساسية</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">واجهة أوضح، تجربة أنظف، وأداء محسوب</h2>
            <p className="mt-4 text-base leading-8 text-fg-3">
              التحسينات تركّز على الوضوح وسرعة الاستخدام، بدون مؤثرات مبالغ فيها أو تعقيد يرهق المتصفح.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <article key={feature.title} className="surface-elevated p-6 transition-transform duration-200 hover:-translate-y-1">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-brass/20 bg-brass/10 text-brass-ring">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-fg-1">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-fg-3">{feature.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow Section ─────────────────────────────────────────────────── */}
      <section id="workflow" className="border-y border-line/60 bg-surface-1/30 py-20">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-sm font-medium text-brass-ring">كيف تعمل المنصة</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">مسار بسيط من أول دخول حتى مشاركة الملفات</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {workflow.map((item, index) => (
              <div key={item.title} className="surface-elevated relative p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line/70 bg-surface-2/70 text-brass-ring">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold text-fg-4">0{index + 1}</span>
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-fg-3">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Section ───────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-accent/20 bg-brand-accent/8 px-4 py-2 text-xs font-medium text-brand-accent">
              <HelpCircle className="h-3.5 w-3.5" />
              أسئلة شائعة
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">أجوبة على أكثر الأسئلة شيوعاً</h2>
            <p className="mt-4 text-base text-fg-3">كل ما تحتاج معرفته قبل أن تبدأ.</p>
          </div>

          <div className="mx-auto max-w-3xl grid gap-3">
            {faqs.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────────────────────────────── */}
      <section className="border-t border-line/60 py-20">
        <div className="container mx-auto px-6">
          <div className="surface-floating accent-top mx-auto max-w-4xl p-8 text-center sm:p-10">
            <h3 className="text-2xl font-bold sm:text-3xl">جاهز تبدأ؟ التسجيل مجاني وسريع</h3>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-fg-3">
              أنشئ مساحة عملك الأولى خلال دقيقتين، وادعُ فريقك مباشرةً — بدون بطاقة ائتمان أو اشتراك.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate(user ? '/dashboard' : '/login')}
                className="btn-primary px-8 py-3.5 text-base"
              >
                {user ? 'افتح لوحة التحكم' : 'ابدأ مجاناً'}
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link to="/developers" className="btn-secondary px-6 py-3 text-base">
                تعرف على المطورين
              </Link>
            </div>
            <p className="mt-5 text-xs text-fg-4">مجاني بالكامل · لا بطاقة مطلوبة · ابدأ الآن</p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-line/70 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-6 text-sm text-fg-4 sm:flex-row">
          <Link to="/" className="flex items-center gap-2 hover:text-fg-2">
            <Share2 className="h-4 w-4" />
            <span>Shairley · شيّرلي</span>
          </Link>
          <div className="flex items-center gap-5">
            <a href="#faq" className="transition-colors hover:text-fg-2">الأسئلة الشائعة</a>
            <Link to="/blog/" className="transition-colors hover:text-fg-2">المدونة</Link>
            <Link to="/developers" className="transition-colors hover:text-fg-2">المطورون</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
