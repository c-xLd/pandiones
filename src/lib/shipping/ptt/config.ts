/**
 * PTT web service settings from the environment. Nothing is set until there is a PTT corporate contract:
 * then PTT_MUSTERI_ID and PTT_SIFRE (from the PTT provincial office) switch the panel to API mode.
 *
 * In PTT's data-upload service (kabulEkle2) the sender supplies the barcode (`barkodNo`, from the range PTT
 * assigns with the contract) and uploads the recipient data for it, so the branch finds it when the parcel
 * is scanned. Tracking is gonderiSorgu2. Addresses below are the ones public PTT integrations use; any of
 * them can be overridden if the contract documentation says otherwise.
 */
export type PttConfig = {
  customerId: string;
  password: string;
  /** Web service user name, if PTT gives one (public integrations send "PttWs"). */
  user: string;
  env: 'test' | 'prod';
  acceptUrl: string;
  trackUrl: string;
};

const URLS = {
  prod: { acceptUrl: 'https://pttws.ptt.gov.tr/PttVeriYukleme/services/Sorgu', trackUrl: 'https://pttws.ptt.gov.tr/GonderiTakipV2/services/Sorgu' },
  test: { acceptUrl: 'https://pttws.ptt.gov.tr/PttVeriYuklemeTest/services/Sorgu', trackUrl: 'https://pttws.ptt.gov.tr/GonderiTakipV2Test/services/Sorgu' },
} as const;

export function pttConfig(env: NodeJS.ProcessEnv = process.env): PttConfig | null {
  const customerId = env.PTT_MUSTERI_ID?.trim();
  const password = env.PTT_SIFRE?.trim();
  if (!customerId || !password) return null;
  const mode = env.PTT_ENV === 'test' ? 'test' : 'prod';
  if (mode === 'test' && env.VERCEL_ENV === 'production') throw new Error('PTT_ENV=test üretimde kullanılamaz.');
  return {
    customerId,
    password,
    user: env.PTT_KULLANICI?.trim() || 'PttWs',
    env: mode,
    acceptUrl: env.PTT_KABUL_URL?.trim() || URLS[mode].acceptUrl,
    trackUrl: env.PTT_TAKIP_URL?.trim() || URLS[mode].trackUrl,
  };
}

/** For the panel: never throws. */
export function pttStatus(env: NodeJS.ProcessEnv = process.env): { mode: 'MANUAL' | 'API'; env: 'test' | 'prod' | null; problem: string | null } {
  try {
    const config = pttConfig(env);
    return config ? { mode: 'API', env: config.env, problem: null } : { mode: 'MANUAL', env: null, problem: null };
  } catch (error) {
    return { mode: 'MANUAL', env: null, problem: error instanceof Error ? error.message : 'PTT yapılandırması hatalı.' };
  }
}
