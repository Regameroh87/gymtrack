import type { Metadata } from "next";
import Navbar from "@/components/landing/navbar";
import Hero from "@/components/landing/hero";
import Features from "@/components/landing/features";
import Segments from "@/components/landing/segments";
import Cta from "@/components/landing/cta";
import Footer from "@/components/landing/footer";
import { SITE_URL, BRAND, CONTACT } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title: `${BRAND.name} · ${BRAND.tagline}`,
    description: BRAND.description,
    url: SITE_URL,
  },
};

// Datos estructurados: identidad de la organización + el SaaS en sí.
function JsonLd() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: BRAND.name,
      url: SITE_URL,
      description: BRAND.description,
      email: CONTACT.email,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: BRAND.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, iOS, Android",
      description: BRAND.description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "ARS",
        description: "Demo sin compromiso",
      },
    },
  ];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-brandPrimary-950">
      <JsonLd />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Segments />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
