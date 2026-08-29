import type { Metadata } from 'next';
import InfoPage from '@/components/info-page';
import DeliveryReturnsContent from '@/components/teslimat-iade/delivery-returns-content';

export const metadata: Metadata = { title: 'Teslimat ve İade | Pandiones' };

export default function DeliveryReturnsPage() { 
  return (
    <InfoPage 
      variant="delivery" 
      accent="01→03" 
      kicker="SİPARİŞTEN SONRA" 
      title="TESLİMAT & İADE" 
      intro="Siparişinin hazırlıktan teslimata kadar hangi aşamada olduğunu bil. Kesin kargo ücreti, yöntem ve süre ödeme öncesinde sipariş özetinde gösterilir."
    >
      <DeliveryReturnsContent />
    </InfoPage>
  ); 
}
