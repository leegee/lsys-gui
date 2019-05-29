export const Presets = [

	{
		title: 'Weed',
		total_generations: 5,
		variables: '',
		start: 'X',
		init_y: 400,
		init_x: 0,
		rules: 'X -> C1F[C3+X]F[C3-X]+X\nF->C4FF',
		angle: 40,
		canvas_width: 1000,
		canvas_height: 760,
		turtle_step_x: 10,
		turtle_step_y: 10,
		wrap_angle_at: 0,
		line_width: 11,
		initially: function () {
			this.ctx.rotate(
				(180 * Math.PI / 180)
			);
		}
	},

	{
		title: 'Kock Ring Squared',
		variables: '',
		rules: 'F -> FF-F-F-F-FF\n',
		start: 'F-F-F-F',
		angle: 90,
		total_generations: 4,
		canvas_width: 500,
		canvas_height: 500,
		turtle_step_x: 5,
		turtle_step_y: 5,
		wrap_angle_at: 0,
		line_width: 1
	},

	{
		title: 'Kock Ring',
		variables: '',
		rules: 'F -> C0FF-F-F-F-F-FC1+F\n',
		start: 'F-F-F-F',
		angle: 90,
		total_generations: 4,
		init_x: 360,
		init_y: 360,
		canvas_width: 500,
		canvas_height: 500,
		turtle_step_x: 2,
		turtle_step_y: 2,
		wrap_angle_at: 0,
		line_width: 1
	},

	{
		title: 'Tree Balanced',
		variables: '',
		rules: 'X -> C0FF[+X][-X]C1FC2X\n' +
			'F -> FF\n',
		start: 'X',
		angle: 40,
		init_x: 0,
		init_y: 0,
		canvas_width: 900,
		canvas_height: 600,
		turtle_step_x: 5,
		turtle_step_y: 5,
		total_generations: 5,
		wrap_angle_at: 0,
		line_width: 0.4,
		time_scale_lines: 5
	},

	{ // list all, even unused, keys on this first eleemnt
		title: 'Parametric test',
		variables: "#define $W 0.5\n" +
			"#define $AS  2\n" +
			"#define $BS  1\n" +
			"#define $R   1\n" +
			"#define $L  -1",
		rules: "F($s,$o) : $s == $AS && $o == $R -> F($AS,$L)F($BS,$R)\n" +
			"F($s,$o) : $s == $AS && $o == $L -> F($BS,$L)F($AS,$R)\n" +
			"F($s,$o) : $s == $BS                -> F($AS,$o)\n",
		start: "!($W)F($BS,$R)",
		angle: 22,
		init_x: 120,
		init_y: 120,
		canvas_width: 1000,
		canvas_height: 1000,
		turtle_step_x: 4,
		turtle_step_y: 4,
		total_generations: 10,
		line_width: 4
	},

	{
		title: 'Tree 1',
		variables: '',
		rules: 'F->C0FF-[C1-F+F+F]+[C2+F-F-F]',
		start: 'F',
		angle: 22,
		init_x: 0,
		init_y: 0,
		canvas_width: 1000,
		canvas_height: 1000,
		turtle_step_x: 4,
		turtle_step_y: 4,
		total_generations: 5,
		line_width: 1,
		wrap_angle_at: 12
	},

	{
		title: 'Tree x',
		variables: '',
		rules: "X->C0F-[C2[X]+C3X]+C1F[C3+FX]-X\nF->FF",
		start: 'X',
		angle: 27,
		init_x: 0,
		init_y: 0,
		canvas_width: 1000,
		canvas_height: 1000,
		turtle_step_x: 8,
		turtle_step_y: 8,
		total_generations: 6,
		line_width: 3,
		wrap_angle_at: 12
	}, {
		title: 'Tree x',
		variables: '',
		rules: "X->C0F-[C2[X]+C3X]+C1F[C3+FX]-X\nF->FF",
		start: 'X',
		angle: 27,
		init_x: 0,
		init_y: 0,
		canvas_width: 1000,
		canvas_height: 1000,
		turtle_step_x: 8,
		turtle_step_y: 8,
		total_generations: 6,
		line_width: 3,
		wrap_angle_at: 12
	},

	{
		title: 'Sierpinski Median Curve (2 gens)',
		variables: '',
		rules: "L->+R-F-R+\nR->-L+F+L-",
		start: 'L--F--L--F',
		angle: 45,
		init_x: 0,
		init_y: 0,
		canvas_width: 1000,
		canvas_height: 1000,
		turtle_step_x: 10,
		turtle_step_y: 10,
		total_generations: 2,
		line_width: 3,
		wrap_angle_at: 12
	},

	{
		title: 'Sierpinski Median Curve (4 gens)',
		variables: '',
		rules: "L->+R-F-R+\nR->-L+F+L-",
		start: 'L--F--L--F',
		angle: 45,
		init_x: 0,
		init_y: 0,
		canvas_width: 1000,
		canvas_height: 1000,
		turtle_step_x: 10,
		turtle_step_y: 10,
		total_generations: 4,
		line_width: 3,
		wrap_angle_at: 12
	},

	{
		title: 'Koch Snowflake',
		variables: '',
		rules: "F->F-F++F-F\nX->FF",
		start: 'F++F++F',
		angle: 60,
		init_x: 0,
		init_y: 0,
		canvas_width: 1000,
		canvas_height: 1000,
		turtle_step_x: 4,
		turtle_step_y: 4,
		total_generations: 4,
		line_width: 6,
		wrap_angle_at: 12
	},

	{
		title: 'Tree 3',
		variables: '',
		rules: 'F -> FF-[-F+F]+[+F-F]',
		start: 'F',
		angle: 22,
		init_x: 0,
		init_y: 0,
		canvas_width: 1000,
		canvas_height: 1000,
		turtle_step_x: 4,
		turtle_step_y: 4,
		total_generations: 5,
		wrap_angle_at: 12
	},

	{
		title: 'Tree 4',
		variables: '',
		rules: "F -> F[-FF]F[+FF]F",
		start: 'F',
		angle: 22,
		init_x: 0,
		init_y: 0,
		canvas_width: 1000,
		canvas_height: 1000,
		turtle_step_x: 4,
		turtle_step_y: 4,
		total_generations: 5,
		wrap_angle_at: 12
	},

	{
		title: 'Dragon Curve',
		variables: '',
		rules: "X->X+YF\nY->FX-Y",
		start: 'FX',
		angle: 90,
		init_x: 800,
		init_y: 100,
		canvas_width: 1000,
		canvas_height: 1000,
		turtle_step_x: 5,
		turtle_step_y: 5,
		total_generations: 7,
		line_width: 8,
		wrap_angle_at: 12
	}
];
