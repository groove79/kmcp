declare module "popbill" {
  interface Config {
    LinkID: string; SecretKey: string; IsTest: boolean;
    IPRestrictOnOff?: boolean; UseStaticIP?: boolean; UseGAIP?: boolean; UseLocalTimeYN?: boolean;
    defaultErrorHandler?: (e: { code: number | string; message: string }) => void;
  }
  export function config(c: Config): void;
  export const MgtKeyType: { SELL: "SELL"; BUY: "BUY"; TRUSTEE: "TRUSTEE" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function TaxinvoiceService(): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function HTTaxinvoiceService(): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function KakaoService(): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function ClosedownService(): any;
}
