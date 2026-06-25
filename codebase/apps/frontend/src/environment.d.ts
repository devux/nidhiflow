declare namespace NodeJS {
  interface ProcessEnv {
    readonly FLOW_AI_ENABLED?: string;
    readonly NIDHIFLOW_API_BASE_URL?: string;
  }
}

declare module "*.png" {
  const src: string;
  export default src;
}
