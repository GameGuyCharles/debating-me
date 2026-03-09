import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-purple-500/8 blur-[100px]" />
      </div>
      <Link
        href="/"
        className="mb-8 text-3xl font-bold tracking-tight"
      >
        Debating<span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">.me</span>
      </Link>
      {children}
    </div>
  );
}
