const SplashScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-forest via-forest-2 to-forest-3">
    <div className="text-7xl mb-5 animate-float">🏠</div>
    <h1 className="font-display font-black text-5xl text-cream tracking-tight mb-3 animate-fade-up" style={{ animationDelay: ".1s" }}>
      HouseHub
    </h1>
    <p className="text-cream/65 text-lg font-medium mb-1 animate-fade-up" style={{ animationDelay: ".2s" }}>
      Organized House 🏡 → Happy People 😊
    </p>
    <p className="text-cream/35 text-sm animate-fade-up" style={{ animationDelay: ".3s" }}>
      Hi there 👋
    </p>
    <div className="flex gap-2 justify-center mt-7 animate-fade-in" style={{ animationDelay: ".7s" }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            background: i === 1 ? "hsl(var(--gold-2))" : "rgba(255,255,255,.2)",
            animation: `pulse-dot ${1 + i * 0.3}s infinite`,
          }}
        />
      ))}
    </div>
  </div>
);

export default SplashScreen;
