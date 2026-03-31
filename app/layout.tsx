import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { PatientArrivalProvider } from "@/components/patient-arrival-provider";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();

  const { data: clinicInfo } = await supabase
    .from("clinic_info")
    .select("nombre")
    .single();

  const clinicName = clinicInfo?.nombre;
  const title = clinicName
    ? `Sistema de Gestion - ${clinicName}`
    : "Sistema de Gestion";

  return {
    metadataBase: new URL(defaultUrl),
    title,
    description: "Sistema de gestión de pacientes y consultas médicas",
  };
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PatientArrivalProvider />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
