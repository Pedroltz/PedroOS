import { welcomePreference } from '../core/WelcomePreference.js';

const hydrated = new WeakSet<HTMLElement>();
const tips = [
  ['Explore o desktop', 'Abra os ícones com um duplo clique. No celular, basta um toque. Use o menu Iniciar para encontrar os aplicativos do portfólio.'],
  ['Projetos em destaque', 'A janela GitHub apresenta uma seleção de projetos do perfil de Pedro Tunin. Todos também têm uma ficha própria no catálogo de projetos.'],
  ['Jogos no navegador', 'Abra Meu Computador e explore C:\\Jogos. Os jogos usam o processamento do seu navegador. Você também pode digitar doom no Terminal PedroOS.'],
  ['Um endereço diferente', 'O navegador guarda uma página especial. Abra o Navegador PedroOS e digite about:mozilla na barra de endereço.'],
  ['Um segredo no Campo Minado', 'Com o Campo Minado aberto, digite xyzzy para ativar o pixel espião. Passe o ponteiro sobre as casas e observe o canto superior esquerdo.'],
  ['Recursos do sistema', 'Até um desktop clássico tem seus limites. Muitas janelas abertas podem esgotar os recursos do PedroOS 95 e provocar uma tela azul.'],
] as const;

export function hydrateWelcome(root: HTMLElement): void {
  if (hydrated.has(root)) return;
  hydrated.add(root);
  const checkbox = root.querySelector<HTMLInputElement>('[data-welcome-startup]')!;
  checkbox.id = `${root.closest<HTMLElement>('[data-window-id]')?.dataset.windowId}-welcome-startup`;
  root.querySelector<HTMLLabelElement>('[data-welcome-startup-label]')!.htmlFor = checkbox.id;
  checkbox.checked = welcomePreference.read();
  checkbox.addEventListener('change', () => welcomePreference.set(checkbox.checked));
  let current = 0;
  root.querySelector('[data-welcome-next]')!.addEventListener('click', () => {
    current = (current + 1) % tips.length;
    root.querySelector('[data-welcome-tip-title]')!.textContent = tips[current][0];
    root.querySelector('[data-welcome-tip-text]')!.textContent = tips[current][1];
  });
}
