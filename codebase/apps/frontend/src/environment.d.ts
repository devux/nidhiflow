declare const __ANDROID_NOTIFICATION_TRANSACTIONS_ENABLED__: string | undefined;
declare const __DIRECT_UPI_ENABLED__: string | undefined;

declare namespace NodeJS {
  interface ProcessEnv {
    readonly DIRECT_UPI_ENABLED?: string;
    readonly ANDROID_NOTIFICATION_TRANSACTIONS_ENABLED?: string;
    readonly FLOW_AI_ENABLED?: string;
    readonly NIDHIFLOW_API_BASE_URL?: string;
  }
}

declare module "*.png" {
  const src: string;
  export default src;
}
