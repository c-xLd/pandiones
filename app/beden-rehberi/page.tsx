import type { Metadata } from 'next';
import InfoPage from '@/components/info-page';
import SizeGuide from '@/components/beden-rehberi/size-guide';

export const metadata: Metadata = { 
  title: 'Beden Rehberi | Pandiones', 
  description: 'Pandiones ürünlerinde doğru bedeni seçmek için ölçüm rehberi.' 
};

export default function SizeGuidePage() { 
  return (
    <InfoPage 
      variant="size" 
      accent="3 ADIM" 
      kicker="SANA EN YAKIN FORM" 
      title="BEDEN REHBERİ" 
      intro="Doğru beden yalnızca bir sayı değil; ürünün formu, esnekliği ve sende nasıl durmasını istediğinle birlikte değerlendirilir."
    >
      <SizeGuide />
    </InfoPage>
  );
}
