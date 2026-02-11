export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen flex overflow-hidden">

      {/* LEFT PANEL */}
      <div className="hidden lg:flex w-1/2 relative items-center
        bg-gradient-to-br from-[#2b1e1a] via-[#3b2a25] to-[#1c1412] overflow-hidden">

        {/* glow blobs */}
        <div className="absolute w-[900px] h-[900px] bg-orange-400/10 blur-[200px] rounded-full -bottom-60 -left-60" />
        <div className="absolute w-[600px] h-[600px] bg-pink-500/10 blur-[180px] rounded-full top-0 right-0" />

        {/* content */}
        <div className="z-10 text-left max-w-xl px-24 text-white">
          <img src="/logo.png" className="w-20 mb-10" />

          <h1 className="text-7xl font-semibold mb-6 leading-tight">
            NoteFlix
          </h1>

          <p className="text-slate-300 text-xl leading-relaxed">
            Turn YouTube lectures into
            <br /> beautiful notes.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center
        bg-gradient-to-br from-[#f5f5f7] to-[#f1edea]">

        <div className="bg-white/80 backdrop-blur-2xl p-16 rounded-[34px]
          shadow-[0_40px_120px_rgba(0,0,0,0.25)] w-[520px] relative">
          {children}
        </div>

      </div>
    </div>
  );
}
