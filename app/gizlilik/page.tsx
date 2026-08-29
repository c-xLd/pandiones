import type { Metadata } from 'next';
import InfoPage from '@/components/info-page';
import PrivacyContent from '@/components/gizlilik/privacy-content';

export const metadata: Metadata = { 
  title: 'Gizlilik | Pandiones', 
  robots: { index: true, follow: true } 
};

export default function PrivacyPage() { 
  return (
    <InfoPage 
      variant="legal" 
      accent="KVKK" 
      kicker="VERİLERİN / SENİN" 
      title="GİZLİLİK" 
      intro="Pandiones, sipariş ve mağaza işlevleri için gerekli bilgileri amacına uygun ve sınırlı biçimde işlemeyi hedefler."
    >
      <PrivacyContent />
    </InfoPage>
  ); 
}
