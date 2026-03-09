import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            Debating<span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">.me</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Log In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 shadow-lg shadow-primary/25">
                Sign Up Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* Background gradient blobs */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
            <div className="absolute top-[10%] right-[-15%] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[30%] h-[400px] w-[400px] rounded-full bg-pink-500/8 blur-[100px]" />
          </div>

          <div className="container mx-auto flex flex-col items-center justify-center gap-8 px-4 py-28 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live debates happening now
            </div>

            <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              Debate with{" "}
              <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Facts
              </span>
              ,<br />
              Not Feelings
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">
              The platform where AI evaluates the quality of your arguments in
              real-time. Challenge friends, debate strangers, and see how well
              your reasoning holds up.
            </p>
            <div className="flex gap-4 pt-2">
              <Link href="/register">
                <Button size="lg" className="bg-gradient-to-r from-primary to-purple-500 text-lg px-8 shadow-lg shadow-primary/25 hover:opacity-90 hover:shadow-xl hover:shadow-primary/30 transition-all">
                  Start Debating
                </Button>
              </Link>
              <Link href="/live">
                <Button size="lg" variant="outline" className="text-lg px-8 border-border/60 hover:bg-accent/50 transition-all">
                  Watch Live
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["bg-primary", "bg-purple-500", "bg-pink-500", "bg-orange-500"].map((color, i) => (
                  <div key={i} className={`h-8 w-8 rounded-full ${color} border-2 border-background flex items-center justify-center text-xs text-white font-bold`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <span>Join the conversation</span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border/40 py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold sm:text-4xl">
                How it works
              </h2>
              <p className="mt-3 text-muted-foreground text-lg">Three steps to your first debate</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard
                emoji="🎯"
                title="Challenge Anyone"
                description="Pick a topic, choose your side, and challenge a friend or find an opponent in the lobby. Set your own rules."
                gradient="from-primary/10 to-purple-500/5"
              />
              <FeatureCard
                emoji="🤖"
                title="AI Evaluates Every Claim"
                description="Each argument is broken into claims and evaluated in real-time. See how factually accurate and well-supported your reasoning is."
                gradient="from-purple-500/10 to-pink-500/5"
              />
              <FeatureCard
                emoji="📊"
                title="Track Your Growth"
                description="See your argument quality improve over time. Review detailed scoring breakdowns and share debate replays."
                gradient="from-pink-500/10 to-orange-500/5"
              />
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard
                emoji="⚖️"
                title="Custom Rules"
                description="Set ground rules both sides agree on. AI enforces them — break a rule and lose points automatically."
                gradient="from-blue-500/10 to-primary/5"
              />
              <FeatureCard
                emoji="🎲"
                title="Fair Start"
                description="A coin flip decides who goes first. No advantage, no bias — just pure argumentation from the start."
                gradient="from-green-500/10 to-teal-500/5"
              />
              <FeatureCard
                emoji="👀"
                title="Live Spectating"
                description="Watch debates unfold in real-time with live scoring. Chat with other spectators as the action happens."
                gradient="from-amber-500/10 to-orange-500/5"
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-purple-500 p-12 text-center shadow-2xl shadow-primary/20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
              <div className="relative">
                <h2 className="text-3xl font-bold text-white sm:text-4xl">
                  Ready to test your reasoning?
                </h2>
                <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
                  Join Debating.me and see how your arguments measure up when
                  every claim is evaluated.
                </p>
                <Link href="/register">
                  <Button size="lg" className="mt-8 bg-white text-primary hover:bg-white/90 text-lg px-8 shadow-lg">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto flex items-center justify-center px-4 text-sm text-muted-foreground">
          Debating.me &mdash; Where every argument gets a fair hearing.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  emoji,
  title,
  description,
  gradient,
}: {
  emoji: string;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className={`group rounded-xl border border-border/50 bg-gradient-to-br ${gradient} p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-primary/20`}>
      <span className="text-3xl block">{emoji}</span>
      <h3 className="mt-4 mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
