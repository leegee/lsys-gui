/*

#define W	0.5
#define AS 	 2
#define BS 	 1
#define R 	 1
#define L	-1


 w : !(W)F(BS,R)
p1 : F(s,o) : s == AS && o == R -> F(AS,L)F(BS,R)
p2 : F(s,o) : s == AS && o == L -> F(BS,L)F(AS,R)
p3 : F(s,o) : s == BS	        -> F(AS,o)

p1 : F(s,o) : s == 2 && o ==  1 -> F(2,-1)F(1, 1)
p2 : F(s,o) : s == 2 && o == -1 -> F(1,-1)F(2, 1)
p3 : F(s,o) : s == 1 &&         -> F(2, o)

!(0.5)F(1,1)
!(0.5)F(2,1)
!(0.5)F(2,-1)F(1,1)
!(0.5)F(1,-1)F(2,1)F(2,1)

rule p2
F(1,-1)F(2,1)F(2,1)
rule p3

*/

const RAD = Math.PI / 180.0;

export class LsysParametric {
	options = {
		start: 'F',
		variables: '',
		rules: null,
		mergeDuplicates: 1,
		duration: 48,
		scale: 'pentatonic',
		initialNoteDecimal: 58,
		canvasWidth: 2000,
		canvasHeight: 800,
		angle: 30,
		turtleStepX: 10,
		turtleStepY: 10,
		initX: null,
		initY: null,
		lineWidth: 1,
		timeScaleLines: 1,
		clearCanvas: true,
		colours: [
			"rgba(130,  90, 70, 0.8)",
			"rgba(33, 180, 24, 0.6)",
			"rgba(50, 210, 50, 0.5)",
			"rgba(70, 255, 70, 0.4)"
		]
	};

	constructor(args) {
		this.setOptions(args);

		this.xoffset = 0;
		this.yoffset = 0;
		this.generation = 0;
		this.totalGenerations = null;
		this.variables = null;
		this.interpolateVarsRe = null;

		this.initialize();

		this.x = this.maxX = this.minX = this.options.initX || 0;
		this.y = this.maxY = this.minY = this.options.initY || 0;
		this.content = '';

		this.castRules();
		this.castVariables();
		this.interpolateVarsRe = /(\$\w+)/g;
		this.str2reRe = /(\w+)\(([^\)]+)\)/g;

		console.info('Variables: %O\nRules:\n%O', this.variables, this.options.rules);
	};

	initialize(options = {}) {
		this.colour = this.options.colours[0];
		if (!this.options.canvas) {
			throw new Error('No options.canvas!');
		}
		this.ctx = this.options.canvas.getContext("2d");
		if (!this.ctx) {
			throw new Error('No ctx from options.canvas!');
		}
		// Translate context to center of canvas:
		this.ctx.translate(this.options.canvas.width / 2, this.options.canvas.height / 2);
		// Flip context vertically
		if (this.options.initially && typeof this.options.initially === 'function' ) {
			this.options.initially.call(this);
		}
	};

	setOptions(options) {
		options = options || {};
		if (typeof options !== 'object') {
			throw new TypeError('options was not an object, %O', options);
		}
		Object.keys(options).forEach((i) => {
			if (typeof options[i] === 'string') {
				if (options[i].match(/^\s*[.\d+]+\s*$/)) {
					options[i] = parseFloat(options[i]);
				}
				else if (options[i].match(/^\d+$/)) {
					options[i] = Number(options[i]);
				}
			}
			this.options[i] = options[i];
		});
	};

	castVariables(str) {
		str = str || this.options.variables;
		if (!str) return;
		let rv = {};
		str.split(/[\n\r\f]+/).forEach((line) => {
			// Detect
			const name2val = line.match(/^\s*(#define)?\s*(\$\w+)\s*(\S+)\s*$/);
			// Store
			if (name2val) {
				rv[name2val[2]] = name2val[3];
				// Cast
				if (rv[name2val[2]].match(/^(-+)?\d+(\.\d+)?$/)) {
					rv[name2val[2]] = parseFloat(rv[name2val[2]]);
				}
			} else {
				throw new Error("Bad variable definition:\n" + name2val + "\non line: \n" + line);
			}
		});
		this.variables = rv;
		return rv;
	};

	/* Creates a strucure as follows:
		[ [to_match, condition, substitution ], ...]
		*/
	castRules(strRules) {
		strRules = strRules || this.options.rules;
		const rv = [];

		// F(s,o) : s == AS && o == R -> F(AS,L)F(BS,R) \n
		strRules.split(/[\n\r\f]+/).forEach((line) => {
			if (line === '') {
				return;
			}
			let rule = '';
			const headTail = line.match(/^\s*(.+?)\s*->\s*([^\n\r\f]+)\s*/);

			if (headTail != null) {
				const matchCondition = headTail[1].match(/([^:]+)\s*:?\s*(.*?)\s*$/);
				const head = matchCondition[1].match(/^(.+?)\s*$/);
				rule = [
					head[1],
					matchCondition[2],
					headTail[2]
				];
			} else {
				throw new Error('Parse error ' + line);
			}
			rv.push(rule);
		});

		this.options.rules = rv;
		return rv;
	};

	dsin(radians) {
		return Math.sin(radians * RAD)
	};

	dcos(radians) {
		return Math.cos(radians * RAD)
	};

	generate(generations) {
		this.totalGenerations = generations;
		console.debug('Enter generate to create %d generations', this.totalGenerations);

		this.content = this.options.start;
		this.content = this.interploateVars(this.content);

		for (
			this.generation = 1; this.generation <= this.totalGenerations; this.generation++
		) {
			this.applyRules();
		}

		this.render();

		this.finalise();

		console.debug('Leave generate');
		return this;
	};

	interploateVars(str) {
		const rv = str.replace(
			this.interpolateVarsRe,
			(match) => {
				return (typeof this.variables[match] !== 'undefined') ?
					this.variables[match] : match;
			}
		);
		console.log('Interpolate vars: %s ... %s', str, rv);
		return rv;
	};

	string2reAndArgNames(str) {
		let argNames = [];

		const rv = str.replace(
			this.str2reRe,
			(match, varname, argsCsv) => {
				argNames = argsCsv.split(/\s*,\s*/);
				// Could cache these based on args.length:
				return '(' + varname + ')\\(' + argNames.map(() => {
					return '([\\$\\w-]+)'
				}) + '\\)';
			}
		);

		return [
			new RegExp(rv, 'g'),
			argNames
		];
	};

	applyRules() {
		console.debug('Enter applyRules for generation ' + this.generation);
		let finalContent = '';

		// Itterate over atoms within the content?
		const atoms = this.content.match(/(.(\([^)]+\))?)/g);
		if (this.content != atoms.join('')) {
			console.error(atoms);
			console.error('atoms ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
			throw new Error('Atomic regex failed, results would be wrong');
		}

		atoms.forEach((atom) => {
			// Run production rules:
			let ruleNumber = 0;
			let ruleSuccessfullyApplied = false;

			this.options.rules.forEach((rule) => {
				ruleNumber++;

				if (ruleSuccessfullyApplied) {
					console.log('Skip rule ' + ruleNumber + ' as have made substituion');
					return;
				}

				// Re-write the rule to replace variables with literals, where possible:
				const [rule2findRe, ruleArgNames] = this.string2reAndArgNames(rule[0]);
				console.log('Rule ' + ruleNumber + ' says find ' + rule[0] + ' in content of ' + atom + ' using ', rule2findRe);

				// Find the rule pattern (left-hand side of condition)
				// and replace if condition is met
				const atomAfterRuleApplied = atom.replace(
					rule2findRe,
					([original, ..._arguments]) => {
						/*  On entering this function, a match has been found
								but rules have yet to be tested */
						// Ascribe variables
						let i = 0;
						_arguments.filter(str => str.match(/\d+/)).forEach((numericValue) => {
							this.variables[ruleArgNames[i]] = numericValue;
							i++;
						});

						// Get the rule code:
						const ruleConditionJs = this.interploateVars(rule[1]);
						console.log('Rule ' + ruleNumber + ' condition: ' + ruleConditionJs);

						// Decide if the substitution take place
						let ruleConditionMet = ruleConditionJs.length === 0; // || eval ruleConditionMet

						if (!ruleConditionMet) {
							try {
								ruleConditionMet = eval(ruleConditionJs);
							} catch (e) {
								console.warn(e);
							}
						}

						// No substitutions
						if (!ruleConditionMet) {
							console.debug('Condition not met');
							return original;
						}

						ruleSuccessfullyApplied = true;
						const substituted = this.interploateVars(rule[2]);
						console.log('Condition met:------> substituted result = ' + rule[2] + '  RV== ' + substituted);

						return substituted;
					} // end of replacement function
				); // end of replacement call

				// If the rule is not met, the replacement value will be undefined,
				// do not write this into the string:
				if (ruleSuccessfullyApplied) {
					atom = atomAfterRuleApplied;
					console.log('After fulfilled rule ' + ruleNumber + ' was applied, atom is: ' + atom);
					return;
				}

			}); // Next rule

			finalContent += atom;
		}); // Next atom

		this.content = finalContent;

		console.debug('After all rules were applied, content is: ', this.content);
		console.log(
			'# FINAL for generation ' + this.generation + '/' + this.totalGenerations +
			' ############################ Content: ' + this.content
		);
	};

	render() {
		let dir = 0;
		const states = [];

		this.stepped = 0;

		// PRODUCTION RULES:
		for (let i = 0; i < this.content.length; i++) {
			let draw = true;
			this.penUp = false;
			// console.log('Do '+i);
			switch (this.content.charAt(i)
				.toLowerCase()) {
				// Set the generation
				case 'f':
					// this.penUp = true; why pen up going forards? nuts.
					break;
				// Set colour
				case 'c':
					this.setColour(parseInt(this.content.charAt(++i), 10));
					draw = false;
					break;
				// Turn one way
				case '+':
					dir += this.options.angle;
					break;
				// Turn the other way
				case '-':
					dir -= this.options.angle;
					break;
				// Start a branch
				case '[':
					states.push([dir, this.x, this.y, this.colour, this.stepped]);
					draw = false;
					break;
				// End a branch
				case ']':
					const state = states.pop();
					dir = state[0];
					this.x = state[1];
					this.y = state[2];
					this.colour = state[3];
					this.stepped = state[4];
					draw = true;
					break;
			};

			if (draw) {
				this.turtleGraph(dir);
				this.stepped++;
			}
		}
	};

	finalise() {
		console.debug('Enter finalise');
		if (this.options.finally && typeof this.options.finally === 'function') {
			console.debug('Call finally');
			this.options.finally.call(this);
		}
		this.resize();
		console.debug('Leave finalise');
	};

	turtleGraph(dir) {
		// console.debug('Move '+dir +' from '+this.x+','+this.y);

		this.ctx.beginPath();
		if (this.options.timeScaleLines > 0) {
			this.ctx.lineWidth = this.options.lineWidth;
		}
		else if (this.options.lineWidth) {
			this.ctx.lineWidth = this.options.lineWidth;
		}
		this.ctx.moveTo(this.x, this.y);

		this.x += (this.dcos(dir) * this.options.turtleStepX);
		this.y += (this.dsin(dir) * this.options.turtleStepY);

		this.x += this.xoffset;
		this.y += this.yoffset;

		this.ctx.lineTo(this.x, this.y);
		this.ctx.closePath();
		if (!this.penUp) this.ctx.stroke();

		if (this.x > this.maxX) this.maxX = this.x;
		if (this.y > this.maxY) this.maxY = this.y;
		if (this.x < this.minX) this.minX = this.x;
		if (this.y < this.minY) this.minY = this.y;
		// console.debug('...to '+this.x+','+this.y);
	};

	setWidth(px) {
		this.ctx.lineWidth = px;
	};

	setColour(index) {
		this.colour = this.options.colours[index];
		this.ctx.strokeStyle = this.colour;
	};

	resize() {
		console.debug('Min: %d , %d\nMax: %d , %d', this.minX, this.minY, this.maxX, this.maxY);
		const wi = (this.minX < 0) ?
			Math.abs(this.minX) + Math.abs(this.maxX) : this.maxX - this.minX;
		const hi = (this.minY < 0) ?
			Math.abs(this.minY) + Math.abs(this.maxY) : this.maxY - this.minY;
		if (this.maxY <= 0) {
			throw new RangeError('maxY out of bounds');
		}
		if (this.maxX <= 0) {
			throw new RangeError('maxX out of bounds');
		}

		const sx = this.options.canvas.width / wi;
		const sy = this.options.canvas.height / hi;

		if (sx !== 0 && sy !== 0) {

			if (this.options.clearCanvas) {
				this.options.canvas.width = this.options.canvas.width;
			}

			this.ctx.scale(sx, sy);

			this.x = this.options.initX || 0; // this.options.turtleStepX|| 0;
			this.y = this.options.initY || this.options.canvasHeight / 2;
			this.y -= this.minY;

			this.render();
			console.debug('Resized via scale %d, %d', sx, sy);
		}
		console.debug('Leave resize');
	};
}
