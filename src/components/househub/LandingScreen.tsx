import { Home, Sparkles, DoorOpen, ArrowRight } from "lucide-react";

interface LandingScreenProps {
  onSetup: () => void;
  onJoin: () => void;
}

const LandingScreen = ({ onSetup, onJoin }: LandingScreenProps) => (
  <div className="min-h-screen flex flex-col bg-background animate-fade-in">
    {/* Header Banner */}
    <div className="bg-gradient-to-br from-[#2a9d8f] via-[#2a9d8f] to-[#2a9d8f]/80 px-6 py-16 pb-20 text-center relative overflow-hidden shadow-md">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 55% at 50% 100%, hsla(173, 58%, 60%, 0.15), transparent)" }} />
      <div className="relative">
        <div className="mb-5 animate-float text-white flex justify-center">
          <div className="relative">
            <Home size={68} strokeWidth={1.5} />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-3 border-b-2 border-white rounded-full opacity-60"></div>
          </div>
        </div>
        <h1 className="font-display font-black text-[42px] text-white tracking-tight mb-3 animate-fade-up" style={{ animationDelay: ".08s" }}>
          HouseHub
        </h1>
        <p className="text-white/90 font-medium text-[19px] animate-fade-up tracking-wide" style={{ animationDelay: ".18s" }}>
          Organized House → Happy People
        </p>
      </div>
    </div>

    {/* Main Content */}
    <div className="flex-1 flex flex-col px-6 py-10 max-w-md mx-auto w-full">
      <p className="font-display font-bold text-2xl mb-6 text-foreground text-center animate-fade-up" style={{ animationDelay: ".35s" }}>
        What would you like to do?
      </p>

      <div className="flex flex-col gap-4 mb-auto">
        {/* Set up card */}
        <button
          className="group w-full p-5 rounded-3xl border-2 border-border bg-card text-left flex items-center gap-4 transition-all duration-300 ease-in-out hover:border-[#2a9d8f]/50 hover:bg-[#2a9d8f]/5 hover:scale-[1.03] hover:shadow-lg active:scale-[0.98] animate-fade-up"
          style={{ animationDelay: ".42s" }}
          onClick={onSetup}
        >
          <div className="w-14 h-14 rounded-2xl bg-[#2a9d8f]/10 flex items-center justify-center text-[#2a9d8f] shrink-0 transition-transform duration-300 group-hover:scale-110">
            <Sparkles size={26} strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold text-foreground mb-1 group-hover:text-[#2a9d8f] transition-colors">Set up a new house</div>
            <div className="font-medium text-[15px] text-muted-foreground">Create your house and invite housemates</div>
          </div>
          <ArrowRight className="text-muted-foreground/40 transition-all duration-300 group-hover:text-[#2a9d8f] group-hover:translate-x-1.5" size={24} />
        </button>

        {/* Join card */}
        <button
          className="group w-full p-5 rounded-3xl border-2 border-border bg-card text-left flex items-center gap-4 transition-all duration-300 ease-in-out hover:border-[#2a9d8f]/50 hover:bg-[#2a9d8f]/5 hover:scale-[1.03] hover:shadow-lg active:scale-[0.98] animate-fade-up"
          style={{ animationDelay: ".5s" }}
          onClick={onJoin}
        >
          <div className="w-14 h-14 rounded-2xl bg-[#2a9d8f]/10 flex items-center justify-center text-[#2a9d8f] shrink-0 transition-transform duration-300 group-hover:scale-110">
            <DoorOpen size={26} strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold text-foreground mb-1 group-hover:text-[#2a9d8f] transition-colors">Join existing house</div>
            <div className="font-medium text-[15px] text-muted-foreground">Enter your 6-digit house code</div>
          </div>
          <ArrowRight className="text-muted-foreground/40 transition-all duration-300 group-hover:text-[#2a9d8f] group-hover:translate-x-1.5" size={24} />
        </button>
      </div>

      {/* Footer Section */}
      <div className="mt-12 pt-8 border-t border-border/40 text-center animate-fade-up" style={{ animationDelay: ".6s" }}>
        <p className="text-[15px] font-semibold text-[#2a9d8f] leading-relaxed mb-1">
          HouseHub keeps shared homes organized and fair.
        </p>
        <p className="text-[15px] font-medium text-muted-foreground leading-relaxed mb-6">
          Cleaning schedules and supply responsibilities rotate clearly so everyone always knows whose turn it is.
        </p>
        <p className="text-sm font-bold text-[#2a9d8f]/90 uppercase tracking-widest">
          Simple. Fair. Organized living.
        </p>
      </div>
    </div>
  </div>
);

export default LandingScreen;
