import React, { useState } from "react";
import { Layout } from "lucide-react";
import { useMosaicGenerator } from "../hooks/use-mosaic";
import { MosaicForm } from "../components/MosaicForm";
import { MosaicResults } from "../components/MosaicResults";
import { useToast } from "../hooks/use-toast";
import type { MosaicResult } from "@workspace/api-client-react";

export default function Home() {
  const { mutate: generateMosaic, isPending } = useMosaicGenerator();
  const { toast } = useToast();
  const [result, setResult] = useState<MosaicResult | null>(null);

  const handleSubmit = (data: { image: File; baseplateSize: number; columns: number; rows: number; threshold: number }) => {
    generateMosaic(
      { data },
      {
        onSuccess: (res) => {
          setResult(res);
          toast({
            title: "Mosaic Generated!",
            description: "Your LEGO-style mosaic pattern is ready.",
          });
          // Scroll to results cleanly
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        onError: (err: any) => {
          console.error(err);
          toast({
            variant: "destructive",
            title: "Generation Failed",
            description: err.message || "Failed to generate mosaic. Please try again.",
          });
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-inner">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Mosaic Maker</h1>
          </div>
          <div className="text-sm font-medium text-muted-foreground hidden sm:block">
            Professional Studio Tool
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Form */}
          <div className={`lg:col-span-4 lg:sticky lg:top-24 transition-all duration-500 ${result ? 'lg:col-span-4' : 'lg:col-span-5 lg:col-start-4'}`}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Create Pattern</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                Upload any image to generate a precise stud-based mosaic grid using standard color palettes.
              </p>
            </div>
            <MosaicForm onSubmit={handleSubmit} isPending={isPending} />
          </div>

          {/* Right Column: Results */}
          <div className={`lg:col-span-8 transition-all duration-500 ${result ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none hidden lg:block'}`}>
            {result ? (
              <MosaicResults result={result} />
            ) : (
              <div className="h-full min-h-[600px] rounded-3xl border-2 border-dashed border-border bg-white/50 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
                  <Layout className="w-8 h-8 text-zinc-300" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Awaiting Image</h3>
                <p className="text-muted-foreground max-w-sm">
                  Configure your canvas dimensions and upload an image to see the generated mosaic pattern, color requirements, and build guides here.
                </p>
              </div>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}
