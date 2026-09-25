/**
 * Usado apenas pelos SDKs simulados: imita o provedor chamando o nosso
 * webhook alguns segundos depois, como se o cliente tivesse pago.
 */
export function simularWebhook(url: string, corpo: unknown, atrasoMs: number): void {
  setTimeout(() => {
    fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) }).catch(
      (erro) => console.error(`[sandbox] falha ao chamar webhook ${url}:`, erro.message),
    );
  }, atrasoMs).unref();
}
