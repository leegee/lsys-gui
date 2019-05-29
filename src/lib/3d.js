var Lsys = require( "../lib/LsysParametric.common.js" );
window.THREE = require( "../bower_components/threejs/build/three.min.js" );
require( "../bower_components/OrbitControls/index.js" );

if ( 1 == 1 || !console ) {
	console = {};
	console.log = console.warn = console.debug = console.info = function () {};
}
var LOGGER = console; // LOGGER || log4javascript.getLogger();
LOGGER.trace = console.debug;

window.requestAnimationFrame = ( function () {
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function ( callback ) {
			window.setTimeout( callback, 1000 / 60 );
		};
} )();

const RAD = Math.PI / 180.0;

var exports = module.exports = function ThreeD( options ) {
	Lsys.call( this, options );
};

Lsys.prototype.initialize = function ( options ) {
	this.z = this.options.init_z || 0;

	this.scene = new THREE.Scene();

	this.camera = new THREE.PerspectiveCamera(
		33,
		window.innerWidth / window.innerHeight,
		1,
		10000
	);
	this.camera.position.y = window.innerHeight / 10;
	this.camera.position.x = window.innerWidth / 5;
	this.camera.position.z = 0;

	this.scene.add( this.camera );

	this.renderer = new THREE.WebGLRenderer();
	this.renderer.setSize( window.innerWidth, window.innerHeight );
	this.options.el.appendChild( this.renderer.domElement );

	var pointLight = new THREE.PointLight( 0xFFFFFF );
	pointLight.position.x = 100;
	pointLight.position.y = 50;
	pointLight.position.z = 130;
	this.scene.add( pointLight );

	var planeGeo = new THREE.PlaneGeometry(
		this.options.canvas_width, this.options.canvas_height // , 10, 10
	);
	var planeMat = new THREE.MeshLambertMaterial( {
		color: 0xFFFFFF
	} );
	var plane = new THREE.Mesh( planeGeo, planeMat );
	plane.rotation.x = -Math.PI / 2;
	plane.position.y = 0;
	plane.receiveShadow = true;
	this.scene.add( plane );

	this.holder = new THREE.Object3D();
	this.scene.add( this.holder );

	this.controls = new THREE.OrbitControls( this.camera );
	this.controls.addEventListener( 'change', this.render );

	this.material = null;

	this.renderer.render( this.scene, this.camera );
};

exports.prototype = Object.create( Lsys.prototype );
exports.prototype.constructor = exports;

exports.prototype.finalise = function () {
	var self = this;
	//    ( function animloop() {
	//  requestAnimationFrame( animloop );
	//  self.renderer.render( self.scene, self.camera );
	// } )();
	LOGGER.debug( 'Finalised' );
};

exports.prototype.interploateVars = function ( str ) {
	var self = this;
	var rv = str.replace(
		this.interpolateVarsRe,
		function ( match ) {
			return ( typeof self.variables[ match ] != 'undefined' ) ?
				self.variables[ match ] : match;
		}
	);
	LOGGER.trace( 'Interpolate vars: ' + str + ' ...... ' + rv );
	return rv;
};

exports.prototype.turtle_graph = function ( dir ) {
	// LOGGER.debug( 'Move '+dir +' from '+this.x+','+this.y );
	var add2x = ( this.dcos( dir ) * ( this.options.turtle_step_x ) );
	var add2y = ( this.dsin( dir ) * ( this.options.turtle_step_y ) );

	this.material = new THREE.MeshLambertMaterial( {
		color: this.colour
	} );

	//      this.ctx.moveTo( this.x, this.y );

	var geo = new THREE.CylinderGeometry(
		Math.abs( add2x ), // radiusTop
		Math.abs( add2x ), // radiusBottom,
		Math.abs( add2x ), // segmentsRadius,
		100, // segmentsHeight
		false // openEnded
	);

	var mesh = new THREE.Mesh( geo, this.material );
	mesh.castShadow = mesh.receiveShadow = true;
	mesh.position.y = this.x;
	mesh.position.x = this.y; // - 500;
	mesh.position.z = 0;
	mesh.rotation.x = 0;
	mesh.rotation.y = 0;
	mesh.rotation.z = 0;

	this.holder.add( mesh );
	this.renderer.render( this.scene, this.camera );

	this.x += add2x;
	this.y += add2y;

	//  LOGGER.debug( '...to '+this.x+','+this.y );
},

exports.prototype.setColour = function ( index ) {
	this.colour = this.options.colours[ index ];
};
