import { UIPanel, UIRow, UIHorizontalRule } from './libs/ui.js';
import { FileLoader } from 'three';

function MenubarFile( editor ) {

	const strings = editor.strings;

	const saveArrayBuffer = editor.utils.saveArrayBuffer;
	const saveString = editor.utils.saveString;

	const container = new UIPanel();
	container.setClass( 'menu' );

	const title = new UIPanel();
	title.setClass( 'title' );
	title.setTextContent( strings.getKey( 'menubar/file' ) );
	container.add( title );

	const options = new UIPanel();
	options.setClass( 'options' );
	container.add( options );

	// New Project

	const newProjectSubmenuTitle = new UIRow().setTextContent( strings.getKey( 'menubar/file/new' ) ).addClass( 'option' ).addClass( 'submenu-title' );
	newProjectSubmenuTitle.onMouseOver( function () {

		const { top, right } = this.dom.getBoundingClientRect();
		const { paddingTop } = getComputedStyle( this.dom );
		newProjectSubmenu.setLeft( right + 'px' );
		newProjectSubmenu.setTop( top - parseFloat( paddingTop ) + 'px' );
		newProjectSubmenu.setDisplay( 'block' );

	} );
	newProjectSubmenuTitle.onMouseOut( function () {

		newProjectSubmenu.setDisplay( 'none' );

	} );
	options.add( newProjectSubmenuTitle );

	const newProjectSubmenu = new UIPanel().setPosition( 'fixed' ).addClass( 'options' ).setDisplay( 'none' );
	newProjectSubmenuTitle.add( newProjectSubmenu );

	// New Project / Empty

	let option = new UIRow().setTextContent( strings.getKey( 'menubar/file/new/empty' ) ).setClass( 'option' );
	option.onClick( function () {

		if ( confirm( strings.getKey( 'prompt/file/open' ) ) ) {

			editor.clear();

		}

	} );
	newProjectSubmenu.add( option );

	//

	newProjectSubmenu.add( new UIHorizontalRule() );

	// New Project / ...

	const examples = [
		{ title: 'menubar/file/new/Arkanoid', file: 'arkanoid.app.json' },
		{ title: 'menubar/file/new/Camera', file: 'camera.app.json' },
		{ title: 'menubar/file/new/Particles', file: 'particles.app.json' },
		{ title: 'menubar/file/new/Pong', file: 'pong.app.json' },
		{ title: 'menubar/file/new/Shaders', file: 'shaders.app.json' }
	];

	const loader = new FileLoader();

	for ( let i = 0; i < examples.length; i ++ ) {

		( function ( i ) {

			const example = examples[ i ];

			const option = new UIRow();
			option.setClass( 'option' );
			option.setTextContent( strings.getKey( example.title ) );
			option.onClick( function () {

				if ( confirm( strings.getKey( 'prompt/file/open' ) ) ) {

					loader.load( 'examples/' + example.file, function ( text ) {

						editor.clear();
						editor.fromJSON( JSON.parse( text ) );

					} );

				}

			} );
			newProjectSubmenu.add( option );

		} )( i );

	}

	// Open

	const openProjectForm = document.createElement( 'form' );
	openProjectForm.style.display = 'none';
	document.body.appendChild( openProjectForm );

	const openProjectInput = document.createElement( 'input' );
	openProjectInput.multiple = false;
	openProjectInput.type = 'file';
	openProjectInput.accept = '.json';
	openProjectInput.addEventListener( 'change', async function () {

		const file = openProjectInput.files[ 0 ];

		if ( file === undefined ) return;

		try {

			const json = JSON.parse( await file.text() );

			async function onEditorCleared() {

				await editor.fromJSON( json );

				editor.signals.editorCleared.remove( onEditorCleared );

			}

			editor.signals.editorCleared.add( onEditorCleared );

			editor.clear();

		} catch ( e ) {

			alert( strings.getKey( 'prompt/file/failedToOpenProject' ) );
			console.error( e );

		} finally {

			form.reset();

		}

	} );

	openProjectForm.appendChild( openProjectInput );

	option = new UIRow()
		.addClass( 'option' )
		.setTextContent( strings.getKey( 'menubar/file/open' ) )
		.onClick( function () {

			if ( confirm( strings.getKey( 'prompt/file/open' ) ) ) {

				openProjectInput.click();

			}

		} );

	options.add( option );

	// Save

	option = new UIRow()
		.addClass( 'option' )
		.setTextContent( strings.getKey( 'menubar/file/save' ) )
		.onClick( function () {

			const json = editor.toJSON();
			const blob = new Blob( [ JSON.stringify( json ) ], { type: 'application/json' } );
			editor.utils.save( blob, 'project.json' );

		} );

	options.add( option );

	//

	options.add( new UIHorizontalRule() );

	// Import

	const form = document.createElement( 'form' );
	form.style.display = 'none';
	document.body.appendChild( form );

	const fileInput = document.createElement( 'input' );
	fileInput.multiple = true;
	fileInput.type = 'file';
	fileInput.addEventListener( 'change', function () {

		editor.loader.loadFiles( fileInput.files );
		form.reset();

	} );
	form.appendChild( fileInput );

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/file/import' ) );
	option.onClick( function () {

		fileInput.click();

	} );
	options.add( option );

	// Generic level adapter — Import / Save Level
	//
	// Loads a same-origin module that exports importLevel(editor) / saveLevel(editor).
	// Adapter URL is auto-probed from a small list of conventional paths on first use
	// and cached in localStorage; "Set Level Adapter URL…" below lets you override.

	const ADAPTER_KEY = 'editor/levelAdapterUrl';
	const PROBE_URLS = [
		'/tools/level-bridge.js',
		'/tools/zombie-blaster-level.js',
		'/level-bridge.js',
	];
	const PORT_SCAN_RANGE = { start: 8000, end: 8090 };

	async function headOk( url ) {

		try {
			const r = await fetch( url, { method: 'HEAD' } );
			return r.ok;
		} catch ( e ) {
			return false;
		}

	}

	async function pingPort( port ) {

		try {
			await fetch( `http://localhost:${port}/`, {
				method: 'HEAD',
				mode: 'no-cors',
				cache: 'no-store',
			} );
			return true;
		} catch ( e ) {
			return false;
		}

	}

	async function scanLocalPorts() {

		const currentPort = Number( location.port ) || ( location.protocol === 'https:' ? 443 : 80 );
		const ports = [];
		for ( let p = PORT_SCAN_RANGE.start; p <= PORT_SCAN_RANGE.end; p ++ ) {

			if ( p !== currentPort ) ports.push( p );

		}

		console.info( `[level-adapter] scanning localhost ports ${PORT_SCAN_RANGE.start}-${PORT_SCAN_RANGE.end}…` );
		const results = await Promise.all(
			ports.map( async p => ( { port: p, alive: await pingPort( p ) } ) )
		);
		return results.filter( r => r.alive ).map( r => r.port );

	}

	// Picker UI shared by the auto-fallback path and the explicit "Switch Server" menu item.
	// Returns true if the browser is being navigated away (caller should abort), false otherwise.
	async function pickServerAndRedirect( { reason } = {} ) {

		const otherPorts = await scanLocalPorts();
		const currentPort = Number( location.port ) || ( location.protocol === 'https:' ? 443 : 80 );

		if ( otherPorts.length === 0 ) {

			alert(
				( reason ? reason + '\n\n' : '' ) +
				`No other local servers detected on ports ${PORT_SCAN_RANGE.start}–${PORT_SCAN_RANGE.end}.\nCurrent: ${currentPort}.`
			);
			return false;

		}

		const list = otherPorts.join( ', ' );
		const choice = prompt(
			( reason ? reason + '\n\n' : '' ) +
			`Local servers detected on ports: ${list}.\nCurrent: ${currentPort}.\n\nEnter a port to switch to (will navigate to http://localhost:<port>/editor/):`,
			String( otherPorts[ 0 ] )
		);
		const port = Number( choice );
		if ( ! Number.isFinite( port ) || port <= 0 ) return false;
		if ( port === currentPort ) return false;

		location.href = `http://localhost:${port}/editor/`;
		return true;

	}

	async function getAdapterUrl() {

		const cached = localStorage.getItem( ADAPTER_KEY );
		if ( cached && await headOk( cached ) ) return cached;
		if ( cached ) localStorage.removeItem( ADAPTER_KEY );

		for ( const url of PROBE_URLS ) {

			if ( await headOk( url ) ) {
				localStorage.setItem( ADAPTER_KEY, url );
				return url;
			}

		}

		const redirected = await pickServerAndRedirect( {
			reason: 'No level adapter on this origin.',
		} );
		if ( redirected ) return null;

		const entered = prompt(
			'No level adapter found on this server.\nEnter the URL of a module that exports importLevel(editor) / saveLevel(editor):',
			'/tools/level-bridge.js'
		);
		if ( ! entered ) return null;
		localStorage.setItem( ADAPTER_KEY, entered );
		return entered;

	}

	async function callAdapter( fnName ) {

		const url = await getAdapterUrl();
		if ( ! url ) return;

		try {
			const mod = await import( url );
			if ( typeof mod[ fnName ] !== 'function' ) {
				throw new Error( `adapter does not export ${fnName}()` );
			}
			await mod[ fnName ]( editor );
		} catch ( e ) {
			alert( `Level ${fnName} failed (${url}): ${e.message}` );
			console.error( e );
		}

	}

	options.add( new UIHorizontalRule() );

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'Import Level' );
	option.onClick( () => callAdapter( 'importLevel' ) );
	options.add( option );

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'Save Level' );
	option.onClick( () => callAdapter( 'saveLevel' ) );
	options.add( option );

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'Switch Server (Port)…' );
	option.onClick( () => pickServerAndRedirect() );
	options.add( option );

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'Set Level Adapter URL…' );
	option.onClick( function () {

		const current = localStorage.getItem( ADAPTER_KEY ) || '';
		const entered = prompt(
			'Level adapter URL (blank = clear and re-probe next time):',
			current
		);
		if ( entered === null ) return;
		if ( entered === '' ) {
			localStorage.removeItem( ADAPTER_KEY );
		} else {
			localStorage.setItem( ADAPTER_KEY, entered );
		}

	} );
	options.add( option );

	// Export

	const fileExportSubmenuTitle = new UIRow().setTextContent( strings.getKey( 'menubar/file/export' ) ).addClass( 'option' ).addClass( 'submenu-title' );
	fileExportSubmenuTitle.onMouseOver( function () {

		const { top, right } = this.dom.getBoundingClientRect();
		const { paddingTop } = getComputedStyle( this.dom );
		fileExportSubmenu.setLeft( right + 'px' );
		fileExportSubmenu.setTop( top - parseFloat( paddingTop ) + 'px' );
		fileExportSubmenu.setDisplay( 'block' );

	} );
	fileExportSubmenuTitle.onMouseOut( function () {

		fileExportSubmenu.setDisplay( 'none' );

	} );
	options.add( fileExportSubmenuTitle );

	const fileExportSubmenu = new UIPanel().setPosition( 'fixed' ).addClass( 'options' ).setDisplay( 'none' );
	fileExportSubmenuTitle.add( fileExportSubmenu );

	// Export DRC

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'DRC' );
	option.onClick( async function () {

		const object = editor.selected;

		if ( object === null || object.isMesh === undefined ) {

			alert( strings.getKey( 'prompt/file/export/noMeshSelected' ) );
			return;

		}

		const { DRACOExporter } = await import( 'three/addons/exporters/DRACOExporter.js' );

		const exporter = new DRACOExporter();

		const options = {
			decodeSpeed: 5,
			encodeSpeed: 5,
			encoderMethod: DRACOExporter.MESH_EDGEBREAKER_ENCODING,
			quantization: [ 16, 8, 8, 8, 8 ],
			exportUvs: true,
			exportNormals: true,
			exportColor: object.geometry.hasAttribute( 'color' )
		};

		// TODO: Change to DRACOExporter's parse( geometry, onParse )?
		const result = exporter.parse( object, options );
		saveArrayBuffer( result, 'model.drc' );

	} );
	fileExportSubmenu.add( option );

	// Export GLB

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'GLB' );
	option.onClick( async function () {

		const scene = editor.scene;
		const animations = getAnimations( scene );

		const optimizedAnimations = [];

		for ( const animation of animations ) {

			optimizedAnimations.push( animation.clone().optimize() );

		}

		const { GLTFExporter } = await import( 'three/addons/exporters/GLTFExporter.js' );

		const exporter = new GLTFExporter();

		exporter.parse( scene, function ( result ) {

			saveArrayBuffer( result, 'scene.glb' );

		}, undefined, { binary: true, animations: optimizedAnimations } );

	} );
	fileExportSubmenu.add( option );

	// Export GLTF

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'GLTF' );
	option.onClick( async function () {

		const scene = editor.scene;
		const animations = getAnimations( scene );

		const optimizedAnimations = [];

		for ( const animation of animations ) {

			optimizedAnimations.push( animation.clone().optimize() );

		}

		const { GLTFExporter } = await import( 'three/addons/exporters/GLTFExporter.js' );

		const exporter = new GLTFExporter();

		exporter.parse( scene, function ( result ) {

			saveString( JSON.stringify( result, null, 2 ), 'scene.gltf' );

		}, undefined, { animations: optimizedAnimations } );


	} );
	fileExportSubmenu.add( option );

	// Export OBJ

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'OBJ' );
	option.onClick( async function () {

		const object = editor.selected;

		if ( object === null ) {

			alert( strings.getKey( 'prompt/file/export/noObjectSelected' ) );
			return;

		}

		const { OBJExporter } = await import( 'three/addons/exporters/OBJExporter.js' );

		const exporter = new OBJExporter();

		saveString( exporter.parse( object ), 'model.obj' );

	} );
	fileExportSubmenu.add( option );

	// Export PLY (ASCII)

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'PLY' );
	option.onClick( async function () {

		const { PLYExporter } = await import( 'three/addons/exporters/PLYExporter.js' );

		const exporter = new PLYExporter();

		exporter.parse( editor.scene, function ( result ) {

			saveArrayBuffer( result, 'model.ply' );

		} );

	} );
	fileExportSubmenu.add( option );

	// Export PLY (BINARY)

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'PLY (BINARY)' );
	option.onClick( async function () {

		const { PLYExporter } = await import( 'three/addons/exporters/PLYExporter.js' );

		const exporter = new PLYExporter();

		exporter.parse( editor.scene, function ( result ) {

			saveArrayBuffer( result, 'model-binary.ply' );

		}, { binary: true } );

	} );
	fileExportSubmenu.add( option );

	// Export STL (ASCII)

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'STL' );
	option.onClick( async function () {

		const { STLExporter } = await import( 'three/addons/exporters/STLExporter.js' );

		const exporter = new STLExporter();

		saveString( exporter.parse( editor.scene ), 'model.stl' );

	} );
	fileExportSubmenu.add( option );

	// Export STL (BINARY)

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'STL (BINARY)' );
	option.onClick( async function () {

		const { STLExporter } = await import( 'three/addons/exporters/STLExporter.js' );

		const exporter = new STLExporter();

		saveArrayBuffer( exporter.parse( editor.scene, { binary: true } ), 'model-binary.stl' );

	} );
	fileExportSubmenu.add( option );

	// Export USDZ

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'USDZ' );
	option.onClick( async function () {

		const { USDZExporter } = await import( 'three/addons/exporters/USDZExporter.js' );

		const exporter = new USDZExporter();

		saveArrayBuffer( await exporter.parseAsync( editor.scene ), 'model.usdz' );

	} );
	fileExportSubmenu.add( option );

	//

	function getAnimations( scene ) {

		const animations = [];

		scene.traverse( function ( object ) {

			animations.push( ... object.animations );

		} );

		return animations;

	}

	return container;

}

export { MenubarFile };
