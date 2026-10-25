import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Role Radar — Product Management Jobs",
  description: "Track product management roles, compare your resume with job descriptions, and save your shortlist.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}