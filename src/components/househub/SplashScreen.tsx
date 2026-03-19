import { useTranslation } from "react-i18next";

const SplashScreen = () => {
  const { t } = useTranslation();
  return (
  <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-background">
    <div className="mb-5 animate-float">
      <img 
        src="/nusa-putra-logo.png" 
        alt="Nusa Putra University" 
        className="nusa-logo h-20 w-auto"
      />
    </div>
    <h1 className="font-display font-black text-5xl text-primary tracking-tight mb-3 animate-fade-up" style={{ animationDelay: ".1s" }}>
      <span className="text-6xl">N</span>usaNest
    </h1>
    <p className="text-muted-foreground text-lg font-medium mb-1 animate-fade-up" style={{ animationDelay: ".2s" }}>
      {t('landing.subtitle', "Student Living, Simplified")} — {t('landing.university', "Universitas Nusa Putra")}
    </p>
    <div className="flex gap-3 justify-center mt-10 animate-fade-in" style={{ animationDelay: ".8s" }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-3 h-3 rounded-full shadow-sm"
          style={{
            backgroundColor: "#770042",
            opacity: i === 1 ? 1 : 0.4,
            animation: `pulse-dot ${1.2 + i * 0.4}s infinite`,
          }}
        />
      ))}
    </div>
  </div>
    );
};

export default SplashScreen;
