// Utilidades de acessibilidade compartilhadas entre páginas públicas.
// Referências: e-MAG (Modelo de Acessibilidade em Governo Eletrônico) e WCAG (W3C).

// Permite ativar por teclado (Enter ou Espaço) elementos que funcionam como
// botão mas não são um <button> nativo (ex.: cards inteiros clicáveis).
// Uso: <div role="button" tabIndex={0} onKeyDown={onActivateKey(minhaFuncao)} onClick={minhaFuncao}>
export function onActivateKey(handler) {
  return (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      handler(e);
    }
  };
}
