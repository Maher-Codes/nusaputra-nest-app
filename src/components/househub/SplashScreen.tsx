import { Home } from "lucide-react";

const SplashScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-background">
    <div className="mb-5 animate-float">
      <img 
        src="/src/assets/nusa-putra-logo.png" 
        alt="Nusa Putra University" 
        className="nusa-logo h-20 w-auto"
      />
    </div>
    <h1 className="font-display font-black text-5xl text-primary tracking-tight mb-3 animate-fade-up" style={{ animationDelay: ".1s" }}>
      <span className="text-6xl">N</span>usaNest
    </h1>
    <p className="text-muted-foreground text-lg font-medium mb-1 animate-fade-up" style={{ animationDelay: ".2s" }}>
      Student Living, Simplified — Universitas Nusa Putra
    </p>
    <div className="flex gap-2 justify-center mt-7 animate-fade-in" style={{ animationDelay: ".7s" }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background: i === 1 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.2)",
            animation: `pulse-dot ${1 + i * 0.3}s infinite`,
          }}
        />
      ))}
    </div>
  </div>
);

export default SplashScreen;
