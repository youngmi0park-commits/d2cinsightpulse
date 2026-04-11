import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function PageHeader({ icon: Icon, title, description }: PageHeaderProps) {
  return (
    <div className="bg-card border border-border rounded-xl px-6 py-5 flex items-start gap-4">
      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0 mt-0.5">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">{description}</p>
      </div>
    </div>
  );
}
