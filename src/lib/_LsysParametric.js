const RAD = Math.PI / 180.0;

export class Lsys {
	constructor(options, canvas) {
		this.options = { // rename to default
			start: 'F',
			variables: '',
			rules: null,
			merge_duplicates: 1,
			duration: 48,
			scale: 'pentatonic',
			initial_note_decimal: 58,
			canvas_width: 2000,
			canvas_height: 800,
			angle: 30,
			turtle_step_x: 10,
			turtle_step_y: 10,
			init_x: null,
			init_y: null,
			line_width: 1,
			time_scale_lines: 1,
			clearCanvas: true,
			colours: [
				"rgba(130,  90, 70, 0.8)",
				"rgba(33, 180, 24, 0.6)",
				"rgba(50, 210, 50, 0.5)",
				"rgba(70, 255, 70, 0.4)"
			]
		};

		this.setOptions(options);
		this.options.canvas = canvas;

		console.debug('Options loaded: ', this.options);

		this.xoffset = 0;
		this.yoffset = 0;
		this.generation = 0;
		this.total_generations = null;
		this.variables = null;
		this.interpolateVarsRe = null;

		this.initialize();

		this.x = this.max_x = this.min_x = this.options.init_x || 0;
		this.y = this.max_y = this.min_y = this.options.init_y || 0;
		this.content = '';

		this.castRules();
		this.castVariables();
		this.interpolateVarsRe = new RegExp(/(\$\w+)/g);

		console.info('Variables: %O\nRules:\n%O', this.variables, this.options.rules);
	}

	initialize() {
		this.colour = this.options.colours[0];
		this.options.canvas.width = this.options.canvas_width;
		this.options.canvas.height = this.options.canvas_height;
		this.ctx = this.options.canvas.getContext("2d");

		// Translate context to center of canvas:
		this.ctx.translate(this.options.canvas.width / 2, this.options.canvas.height / 2);
		// Flip context vertically
		if (this.options.initially &&
			typeof this.options.initially === 'function'
		) {
			this.options.initially.call(this);
		}
	};

	setOptions(options) {
		options = options || {};
		if (typeof options !== 'object') {
			throw new TypeError('options was not an object, %O', options);
		}
		Object.keys(options).forEach((i) => {
			// Cast string
			if (typeof options[i] === 'string' && options[i].match(
					/^\s*[.\d+]+\s*$/)) {
				options[i] = parseFloat(options[i]);
			}
			this.options[i] = options[i];
		});
	};

	castVariables(str) {
		str = str || this.options.variables;
		if (!str) return;
		var rv = {};
		str.split(/[\n\r\f]+/).forEach((line) => {
			// Detect
			var name2val = line.match(/^\s*(#define)?\s*(\$\w+)\s*(\S+)\s*$/);
			// Store
			if (name2val) {
				rv[name2val[2]] = name2val[3];
				// Cast
				if (rv[name2val[2]].match(/^(-+)?\d+(\.\d+)?$/))
					rv[name2val[2]] = parseFloat(rv[name2val[2]]);
			} else {
				throw ("Bad variable definition:\n" + name2val + "\non line: \n" +
					line);
			}
		});
		this.variables = rv;
		return rv;
	};

	/* Creates a strucure as follows:
		[ [to_match, condition, substitution ], ...]
		*/
	castRules(str) {
		str = str || this.options.rules;
		var rv = [];

		// F(s,o) : s == AS && o == R -> F(AS,L)F(BS,R) \n
		str.split(/[\n\r\f]+/).forEach((line) => {
			if (line == '') return;
			var head_tail = line.match(
				/^\s*(.+?)\s*->\s*([^\n\r\f]+)\s*/
			);

			if (head_tail != null) {
				var match_condition = head_tail[1].match(
					/([^:]+)\s*:?\s*(.*?)\s*$/
				);
				var head = match_condition[1].match(/^(.+?)\s*$/);
				var rule = [
					head[1],
					match_condition[2],
					head_tail[2]
				];
			} else {
				throw ('Parse error ' + line);
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
		this.total_generations = generations;

		console.debug('Enter to create %d generations', this.total_generations);

		this.content = this.options.start;
		this.content = this.interploateVars(this.content);

		for (
			this.generation = 1; this.generation <= this.total_generations; this.generation++
		) {
			this.apply_rules();
			// console.info(this.content);
		}

		this.render();

		this.finalise();

		console.debug('Leave generate');
		return this;
	};

	interploateVars(str) {
		var rv = str.replace(
			this.interpolateVarsRe,
			(match) => {
				return (typeof this.variables[match] != 'undefined') ?
					this.variables[match] : match;
			}
		);
		console.log('Interpolate vars: %s ... %s', str, rv);
		return rv;
	};

	string2reAndArgNames(str) {
		var argNames = [];
		this.str2reRe = new RegExp(/(\w+)\(([^\)]+)\)/);

		var rv = str.replace(
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

	apply_rules() {
		console.debug('Enter apply_rules for generation ' + this.generation);
		var finalContent = '';

		// Itterate over atoms within the content?
		var atoms = this.content.match(/(.(\([^)]+\))?)/g);
		console.debug('Initial content:', this.content);
		if (this.content != atoms.join('')) {
			console.ERROR(atoms);
			console.ERROR('atoms ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
			alert('Atomic regex failed, results will be wrong');
		}

		atoms.forEach((atom) => {
			// Run production rules:
			var ruleNumber = 0;
			var ruleSuccessfullyApplied = false;

			this.options.rules.forEach((rule) => {
				ruleNumber++;

				if (ruleSuccessfullyApplied) {
					console.log('Skip rule ' + ruleNumber + ' as have made substituion');
					return;
				}

				// Re-write the rule to replace variables with literals, where possible:
				var _ = this.string2reAndArgNames(rule[0]);
				var rule2findRe = _[0];
				var ruleArgNames = _[1];
				console.log('Rule ' + ruleNumber + ' says find ' + rule[0] +
					' in content of ' + atom);

				// Find the rule pattern (left-hand side of condition)
				// and replace if condition is met
				var atomAfterRuleApplied = atom.replace(
					rule2findRe,
					(original) => {
						/*  On entering this function, a match has been found but rules have yet to be tested */
						// Ascribe variables
						for (var i = 2; i < arguments.length - 2; i++) {
							console.log("Let " + ruleArgNames[i - 2] + ' = ' + arguments[
								i]);
							// Set variables with values found
							this.variables[ruleArgNames[i - 2]] = arguments[i];
						}

						// Get the rule code:
						var ruleConditionJs = this.interploateVars(rule[1]);
						console.log('Rule ' + ruleNumber + ' condition: ' +
							ruleConditionJs);

						// Decide if the substitution take place
						var ruleConditionMet = ruleConditionJs.length == 0 ?
							true : eval(ruleConditionJs);

						// No substitutions
						if (!ruleConditionMet) {
							console.log('Condition not met');
							return original;
						}

						ruleSuccessfullyApplied = true;
						var substituted = this.interploateVars(rule[2]);
						console.log(
							'Condition met:------> substituted result = ' + rule[2] +
							'  RV== ' + substituted
						);

						return substituted;
					} // end of replacement function
				); // end of replacement call

				// If the rule is not met, the replacement value will be undefined,
				// do not write this into the string:
				if (ruleSuccessfullyApplied) {
					atom = atomAfterRuleApplied;
					console.log('After fulfilled rule ' + ruleNumber +
						' was applied, atom is: ' + atom);
					return;
				}

			}); // Next rule

			finalContent += atom;
		}); // Next atom

		this.content = finalContent;

		console.log('After all rules were applied, content is: ', this.content);
		console.log(
			'# FINAL for generation ' + this.generation + '/' + this.total_generations +
			' ############################ Content: ' + this.content
		);
	};

	render() {
		var dir = 0;
		var states = [];
		this.stepped = 0;

		// PRODUCTION_RULES:
		for (var i = 0; i < this.content.length; i++) {
			var draw = true;
			this.penUp = false;

			// console.log('Do '+i);
			switch (this.content.charAt(i).toLowerCase()) {

				case 'f': // Set the generation
					// this.penUp = true; why pen up going forards? Was I nuts?
					break;

				case 'c': // Set colour
					this.setColour(parseInt(this.content.charAt(++i), 10));
					draw = false;
					break;

				case '+': // Turn one way
					dir += this.options.angle;
					break;

				case '-': // Turn the other way
					dir -= this.options.angle;
					break;

				case '[': // Start a branch
					states.push([dir, this.x, this.y, this.colour, this.stepped]);
					draw = false;
					break;

				case ']': // End a branch
					var state = states.pop();
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
		console.info('Leave default_generate_callback');
	};

	finalise() {
		if (this.options.finally &&
			typeof this.options.finally === 'function'
		) {
			this.options.finally.call(this);
		}
		this.resize();
		console.info('Finalised');
	};

	turtleGraph(dir) {
		// console.debug('Move '+dir +' from '+this.x+','+this.y);
		this.ctx.beginPath();
		if (this.options.time_scale_lines > 0) {
			this.ctx.lineWidth = this.options.line_width;
		} else if (this.options.line_width) {
			this.ctx.lineWidth = this.options.line_width;
		}
		this.ctx.moveTo(this.x, this.y);

		this.x += (this.dcos(dir) * this.options.turtle_step_x);
		this.y += (this.dsin(dir) * this.options.turtle_step_y);

		this.x += this.xoffset;
		this.y += this.yoffset;

		this.ctx.lineTo(this.x, this.y);
		this.ctx.closePath();
		if (!this.penUp) this.ctx.stroke();

		if (this.x > this.max_x) this.max_x = this.x;
		if (this.y > this.max_y) this.max_y = this.y;
		if (this.x < this.min_x) this.min_x = this.x;
		if (this.y < this.min_y) this.min_y = this.y;
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
		console.debug('Min: %d , %d', this.min_x, this.min_y);
		console.debug('Max: %d , %d', this.max_x, this.max_y);
		var wi = (this.min_x < 0) ?
			Math.abs(this.min_x) + Math.abs(this.max_x) : this.max_x - this.min_x;
		var hi = (this.min_y < 0) ?
			Math.abs(this.min_y) + Math.abs(this.max_y) : this.max_y - this.min_y;
		if (this.max_y <= 0 || this.max_x <= 0) {
			alert('oops');
			throw new RangeError('Max_x or max_y out of bounds');
		}

		var sx = this.options.canvas.width / wi,
			sy = this.options.canvas.height / hi;

		if (this.options.clearCanvas) {
			this.options.canvas.width = this.options.canvas.width;
		}

		this.ctx.scale(sx, sy);

		this.x = this.options.init_x || 0; // this.options.turtle_step_x || 0;
		this.y = this.options.init_y || this.options.canvas_height / 2;
		this.y -= this.min_y;

		this.render();
		console.debug('Resized');
	}
}