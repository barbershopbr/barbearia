import { Scissors } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grain flex min-h-screen items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="badge-emblem h-14 w-14 border-white/70 text-white">
            <Scissors className="size-6" strokeWidth={1.5} />
          </div>
          {subtitle && (
            <p className="text-xs tracking-[0.3em] text-white/50 uppercase">{subtitle}</p>
          )}
        </div>
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-xl tracking-wide uppercase">{title}</CardTitle>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
