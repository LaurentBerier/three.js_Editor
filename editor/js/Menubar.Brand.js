import { UIPanel } from './libs/ui.js';

function MenubarBrand() {

	const container = new UIPanel();
	container.setClass( 'menu brand-lockup' );
	container.dom.innerHTML = `
		<img class="brand-logo" src="brand/sandscape-icone-violet-favicon.png" alt="Sandscape logo" />
		<div class="brand-copy">
			<p class="brand-name">Sandscape</p>
			<p class="brand-product">Scene Editor</p>
		</div>
	`;

	return container;

}

export { MenubarBrand };
