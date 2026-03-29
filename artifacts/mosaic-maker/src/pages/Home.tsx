// artifacts/mosaic-maker/src/pages/Home.tsx

import React, { useState } from "react";
import { Layout } from "lucide-react";
import { useMosaicGenerator } from "../hooks/use-mosaic";
import { MosaicForm } from "../components/MosaicForm";
import { MosaicResults } from "../components/MosaicResults";
import { useToast } from "../hooks/use-toast";
import type {
  MosaicResult,
  GenerateMosaicBodyPaletteItem,
  GenerateMosaicBodyMode,
} from "@workspace/api-client-react";

type MosaicFormData = {
  image: File;
  baseplateSize: number;
  columns: number;
  rows: number;
  mode: GenerateMosaicBodyMode;
  threshold: number;
  protectEdges: boolean;
  palette: GenerateMosaicBodyPaletteItem[];
};

export default function Home() {
  const { mutate: generateMosaic, isPending } = useMosaicGenerator();
  const { toast } = useToast();
  const [result, setResult] = useState<MosaicResult | null>(null);

  const handleSubmit = (data: MosaicFormData) => {
    generateMosaic(
      { data },
      {
        onSuccess: (res) => {
          setResult(res);
          toast({
            title: "Mosaic Generated!",
            description: "Your LEGO-style mosaic pattern is ready.",
          });
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        onError: (err: any) => {
          console.error(err);
          toast({
            variant: "destructive",
            title: "Generation Failed",
            description:
              err.message || "Failed to generate mosaic. Please try again.",
          });
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-[1720px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3">
              <Layout className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Mosaic Maker
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Professional Studio Tool
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[760px_minmax(0,1fr)] items-start">
          <section className="min-w-0">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                Create Pattern
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload any image to generate a precise stud-based mosaic grid using
                your palette and cleanup settings.
              </p>
            </div>

            <MosaicForm onSubmit={handleSubmit} isPending={isPending} />
          </section>

          <section className="min-w-0">
            {result ? (
              <MosaicResults result={result} />
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-white p-10 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Layout className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Awaiting Image
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                  Configure your canvas, choose your cleanup strength, upload an
                  image, and your generated mosaic pattern will appear here.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}