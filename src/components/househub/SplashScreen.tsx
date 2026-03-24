import { useTranslation } from "react-i18next";

const SplashScreen = () => {
  const { t } = useTranslation();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center p-6 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #770042 0%, #4a0029 100%)" }}
    >
      {/* Decorative background circles */}
      <div
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #D4A373, transparent)" }}
      />
      <div
        className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #ffffff, transparent)" }}
      />
      <div
        className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full opacity-5"
        style={{ background: "radial-gradient(circle, #D4A373, transparent)" }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">

        {/* Logo — gold tint */}
        <div className="mb-6 animate-float">
          <img
            src="/nusa-putra-logo.png"
            alt="Nusa Putra University"
            className="nusa-logo h-24 w-auto"
            style={{
              filter: "brightness(0) saturate(100%) invert(78%) sepia(30%) saturate(500%) hue-rotate(5deg) brightness(95%)",
              opacity: 0.95,
            }}
          />
        </div>

        {/* NusaNest title in gold */}
        <h1
          className="font-display font-black tracking-tight mb-3 animate-fade-up"
          style={{
            fontSize: "52px",
            color: "#D4A373",
            animationDelay: ".1s",
          }}
        >
          <span style={{ fontSize: "62px" }}>N</span>usaNest
        </h1>

        {/* Subtitle in white */}
        <p
          className="text-lg font-medium mb-1 animate-fade-up"
          style={{
            color: "rgba(255,255,255,0.80)",
            animationDelay: ".2s",
          }}
        >
          {t('landing.subtitle', "Student Living, Simplified")}
        </p>

        {/* University name in gold */}
        <p
          className="text-xs font-black uppercase tracking-[0.2em] animate-fade-up"
          style={{
            color: "#D4A373",
            opacity: 0.75,
            animationDelay: ".3s",
          }}
        >
          {t('landing.university', "Universitas Nusa Putra")}
        </p>

        {/* Loading dots in gold */}
        <div
          className="flex gap-3 justify-center mt-12 animate-fade-in"
          style={{ animationDelay: ".8s" }}
        >
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-3 h-3 rounded-full shadow-sm"
              style={{
                backgroundColor: "#D4A373",
                opacity: i === 1 ? 1 : 0.45,
                animation: `pulse-dot ${1.2 + i * 0.4}s infinite`,
              }}
            />
          ))}
        </div>

      </div>
    </div>
  );
};

export default SplashScreen;
