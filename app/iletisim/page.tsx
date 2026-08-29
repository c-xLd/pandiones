import type { Metadata } from 'next';
import InfoPage from '@/components/info-page';
import ContactContent from '@/components/iletisim/contact-content';

export const metadata: Metadata = { title: 'İletişim | Pandiones' };

export default function ContactPage() { 
  return (
    <InfoPage 
      variant="contact" 
      accent="MERHABA" 
      kicker="BİZE ULAŞ" 
      title="İLETİŞİM" 
      intro="Ürün, beden ve sipariş soruların için doğrulanmış Pandiones kanallarından bize ulaşabilirsin."
    >
      <ContactContent />
    </InfoPage>
  ); 
}
