/** Help-centre answers. Every statement here must match what the code does today
 *  (free delivery in checkout, 12-month gift cards, returns from /siparislerim). */

export type FaqTopic = 'siparis' | 'iade' | 'odeme' | 'beden-bakim' | 'hediye-karti';

export type FaqItem = {
  id: string;
  topic: FaqTopic;
  question: string;
  answer: string;
  link?: { href: string; label: string };
};

export const FAQ_TOPICS: Array<{ id: FaqTopic; label: string }> = [
  { id: 'siparis', label: 'Sipariş ve teslimat' },
  { id: 'iade', label: 'İade' },
  { id: 'odeme', label: 'Ödeme' },
  { id: 'beden-bakim', label: 'Beden ve bakım' },
  { id: 'hediye-karti', label: 'Hediye kartı' },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'teslimat-ucreti',
    topic: 'siparis',
    question: 'Teslimat ücreti var mı?',
    answer: 'Hayır. Tüm siparişlerde teslimat ücretsizdir; ödeme adımında ek bir teslimat ücreti eklenmez.',
  },
  {
    id: 'kargoya-verilme',
    topic: 'siparis',
    question: 'Siparişim ne zaman kargoya verilir?',
    answer:
      'Ödemeniz onaylandığında siparişiniz hazırlığa alınır. Kargoya verildiğinde e-posta adresinize kargo firması ve takip kodu gönderilir; aynı bilgiyi Sipariş takibi sayfasında da görebilirsiniz.',
    link: { href: '/siparis-takip', label: 'Siparişini takip et' },
  },
  {
    id: 'siparis-durumu',
    topic: 'siparis',
    question: 'Siparişimin durumunu nereden görebilirim?',
    answer:
      'Hesabınızla verdiğiniz siparişler Siparişlerim sayfasındadır. Hesapsız verdiğiniz siparişleri, sipariş numarası (PAN-123456) ve e-posta adresinizle Sipariş takibi sayfasından sorgulayabilirsiniz.',
    link: { href: '/siparislerim', label: 'Siparişlerim' },
  },
  {
    id: 'adres-degisikligi',
    topic: 'siparis',
    question: 'Siparişten sonra teslimat adresini değiştirebilir miyim?',
    answer: 'Sipariş kargoya verilmeden önce bize yazarsanız adresi güncellemeye çalışırız. Mesajınıza sipariş numaranızı eklemeyi unutmayın.',
    link: { href: '/iletisim', label: 'Bize yaz' },
  },
  {
    id: 'iade-hakki',
    topic: 'iade',
    question: 'İç giyim ürünlerini iade edebilir miyim?',
    answer:
      'Mesafeli Sözleşmeler Yönetmeliği uyarınca teslimattan itibaren 14 gün içinde cayma hakkınız vardır. Ancak koruyucu bandı açılmış, denenmiş ya da sağlık ve hijyen açısından iadesi uygun olmayan iç giyim ürünleri iade alınamaz.',
  },
  {
    id: 'iade-nasil',
    topic: 'iade',
    question: 'İade talebini nasıl oluştururum?',
    answer:
      'Hesabınızla verdiğiniz siparişlerde Siparişlerim sayfasında ilgili siparişi açıp "İade talebi oluştur" düğmesini kullanın. Talebinizin durumu aynı sayfada görünür. Hesapsız siparişler için iletişim formundan sipariş numaranızla bize yazın.',
    link: { href: '/siparislerim', label: 'Siparişlerim' },
  },
  {
    id: 'iade-odeme',
    topic: 'iade',
    question: 'İade tutarı ne zaman hesabıma geçer?',
    answer:
      'İadeniz onaylandığında tutar, ödemeyi yaptığınız karta iade edilir. Ekstrenize yansıma süresi bankanıza bağlıdır.',
  },
  {
    id: 'odeme-yontemleri',
    topic: 'odeme',
    question: 'Hangi ödeme yöntemlerini kullanabilirim?',
    answer:
      'Kredi kartı ve banka kartıyla ödeme yapabilirsiniz. Ödeme, iyzico ödeme formu üzerinden alınır; kartınıza uygun taksit seçenekleri bu formda listelenir.',
  },
  {
    id: 'kart-bilgisi',
    topic: 'odeme',
    question: 'Kart bilgilerim saklanıyor mu?',
    answer: 'Hayır. Kart bilgilerinizi iyzico ödeme formuna girersiniz; Pandiones kart numaranızı görmez ve saklamaz.',
  },
  {
    id: 'kupon',
    topic: 'odeme',
    question: 'İndirim kodumu nereye yazacağım?',
    answer: 'Kodu çantadaki "İndirim veya hediye kartı kodu" ya da ödeme adımındaki "Kupon veya hediye kartı" alanına yazın. İndirim, ödemeden önce toplamdan düşülmüş olarak görünür.',
    link: { href: '/canta', label: 'Çantana git' },
  },
  {
    id: 'beden-secimi',
    topic: 'beden-bakim',
    question: 'Hangi bedeni seçmeliyim?',
    answer:
      'Parçalarımız S, M, L ve XL bedenlerde, Türkiye ölçüleriyle hazırlanır (TR 36–42). Göğüs, bel ve kalça ölçünüzü Beden rehberine girerek size uygun bedeni bulabilirsiniz. İki beden arasında kalırsanız büyük olanı öneririz.',
    link: { href: '/beden-rehberi', label: 'Beden rehberi' },
  },
  {
    id: 'kesim-secimi',
    topic: 'beden-bakim',
    question: 'Hangi kıyafetin altına hangi kesim uyar?',
    answer: 'Bralet, push-up, straplez, tanga, yüksek bel gibi kesimlerin neyle giyildiğini ve ne kadar kapattığını Stil rehberinde karşılaştırabilirsiniz.',
    link: { href: '/stil-rehberi', label: 'Stil rehberi' },
  },
  {
    id: 'yikama',
    topic: 'beden-bakim',
    question: 'İpek ve dantel parçaları nasıl yıkamalıyım?',
    answer:
      'En fazla 30°C\'de elde ya da yıkama filesinde hassas programda yıkayın, sıkmayın ve gölgede düz sererek kurutun. Her zaman önce ürünün etiketine bakın.',
    link: { href: '/bakim-rehberi', label: 'Bakım rehberi' },
  },
  {
    id: 'hediye-karti',
    topic: 'hediye-karti',
    question: 'Dijital hediye kartı nasıl çalışır?',
    answer:
      'Seçtiğiniz tutardaki kart, ödeme onaylandığında alıcının e-posta adresine kişisel notunuzla birlikte kod olarak gönderilir. Kart 12 ay geçerlidir; bakiye tek seferde ya da birden çok siparişte kullanılabilir.',
    link: { href: '/hediye-karti', label: 'Hediye kartı' },
  },
  {
    id: 'hediye-karti-kullanim',
    topic: 'hediye-karti',
    question: 'Hediye kartımı nasıl kullanırım?',
    answer: 'Ödeme adımında kodu "Kupon veya hediye kartı" alanına yazın. Kalan bakiyenizi hesabınızdaki Cüzdan bölümünde görebilirsiniz.',
  },
];
