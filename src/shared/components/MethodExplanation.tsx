import { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  bestFor: string;
  mechanics?: { action: string; result: string }[];
}

export function MethodExplanation({ title, description, bestFor, mechanics }: Props) {
  // Start completely collapsed
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl mb-8 shadow-sm overflow-hidden transition-all">
      {/* Clickable Header */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="bg-accent/10 p-2 rounded-md">
            <Info size={18} className="text-accent" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">{title}</h3>
        </div>
        <div className="text-muted-foreground p-1">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>
      
      {/* Collapsible Content */}
      {isOpen && (
        <div className="p-6 pt-0 border-t border-border/10 animate-in slide-in-from-top-2 fade-in duration-200">
          <p className="text-muted-foreground leading-relaxed mb-6 mt-4">{description}</p>
          
          {mechanics && mechanics.length > 0 && (
            <div className="mb-6 space-y-3">
              <p className="font-medium text-foreground text-sm">How grading works:</p>
              <div className="grid gap-2">
                {mechanics.map((mech, i) => (
                  <div key={i} className="flex items-start gap-3 bg-muted/20 p-3 rounded-lg border border-border/50 text-sm">
                    <span className="font-semibold text-foreground min-w-[110px] shrink-0">
                      {mech.action}
                    </span> 
                    <span className="text-muted-foreground">{mech.result}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-sm pt-4 border-t border-border/50">
            <span className="font-semibold text-foreground shrink-0">Best for:</span>
            <span className="text-muted-foreground">{bestFor}</span>
          </div>
        </div>
      )}
    </div>
  );
}