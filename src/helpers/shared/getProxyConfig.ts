import { AxiosProxyConfig } from 'axios';

export default function getProxyConfig(port: number): AxiosProxyConfig {
  return {
    host: 'usa.static.proxyrack.net',
    port,
    auth: { username: 'jaxenormus', password: process.env.PROXY_PASSWORD },
    protocol: 'http',
  };
}
