import { useState } from "react";
import { FlaskConical, Maximize2, ExternalLink, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Simulation {
  id: string;
  title: string;
  description: string | null;
  phet_url: string;
  thumbnail_url: string | null;
}

interface LabSimulationProps {
  simulations: Simulation[];
}

const LabSimulation = ({ simulations }: LabSimulationProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (simulations.length === 0) return null;

  const active = simulations[activeIndex];

  const handleFullscreen = () => {
    const iframe = document.getElementById("phet-iframe") as HTMLIFrameElement;
    if (iframe?.requestFullscreen) {
      iframe.requestFullscreen();
    }
  };

  return (
    <div className="space-y-4">
      {/* Simulation selector (if multiple) */}
      {simulations.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {simulations.map((sim, i) => (
            <button
              key={sim.id}
              onClick={() => setActiveIndex(i)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                i === activeIndex
                  ? "bg-hero-gradient text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <FlaskConical className="h-4 w-4" />
              {sim.title}
            </button>
          ))}
        </div>
      )}

      {/* Active simulation */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
            <FlaskConical className="h-4 w-4 text-primary" />
            <span>{active.title}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleFullscreen}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              ملء الشاشة
            </Button>
            <a href={active.phet_url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                <ExternalLink className="h-3.5 w-3.5" />
                فتح في نافذة جديدة
              </Button>
            </a>
          </div>
        </div>

        {/* Description */}
        {active.description && (
          <div className="px-4 py-2 border-b border-border bg-accent/5 text-sm text-muted-foreground">
            {active.description}
          </div>
        )}

        {/* iframe */}
        <div className="aspect-[16/10]">
          <iframe
            id="phet-iframe"
            src={active.phet_url}
            className="h-full w-full"
            allowFullScreen
            title={active.title}
          />
        </div>
      </div>

      {/* Usage tips */}
      <div className="rounded-xl border border-border bg-accent/5 p-4 text-sm text-muted-foreground" style={{ direction: "rtl" }}>
        <p className="font-medium text-card-foreground mb-2">💡 تعليمات الاستخدام:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>استخدم الماوس للتفاعل مع عناصر التجربة</li>
          <li>اضغط على زر "ملء الشاشة" للحصول على تجربة أفضل</li>
          <li>يمكنك إعادة التجربة عدة مرات لفهم المفاهيم بشكل أعمق</li>
        </ul>
      </div>
    </div>
  );
};

export default LabSimulation;
